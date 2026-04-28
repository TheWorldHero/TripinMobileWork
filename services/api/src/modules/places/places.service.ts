import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlaceProvider } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import { SearchPlacesDto } from './dto/search-places.dto';
import { StaticMapQueryDto } from './dto/static-map-query.dto';

type LocalPlaceRecord = {
  id: string;
  provider: PlaceProvider;
  providerId: string | null;
  name: string;
  shortName: string | null;
  formattedAddress: string | null;
  provinceName: string | null;
  cityName: string | null;
  districtName: string | null;
  countryCode: string;
  latitude: { toNumber(): number } | null;
  longitude: { toNumber(): number } | null;
};

export type PlaceSearchResult = {
  id?: string;
  provider: PlaceProvider;
  providerId?: string | null;
  name: string;
  shortName?: string | null;
  formattedAddress?: string | null;
  provinceName?: string | null;
  cityName?: string | null;
  districtName?: string | null;
  countryCode: string;
  latitude?: number | null;
  longitude?: number | null;
  source: 'local' | 'amap';
};

type StaticMapImage = {
  contentType: string;
  body: Buffer;
};

type Coordinate = {
  longitude: number;
  latitude: number;
};

@Injectable()
export class PlacesService {
  private readonly amapWebServiceKey?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.amapWebServiceKey =
      this.configService.get<string>('AMAP_WEB_SERVICE_KEY')?.trim() || undefined;
  }

  upsert(dto: CreatePlaceDto) {
    if (dto.providerId) {
      return this.prisma.place.upsert({
        where: {
          provider_providerId: {
            provider: dto.provider,
            providerId: dto.providerId,
          },
        },
        create: dto,
        update: {
          name: dto.name,
          shortName: dto.shortName,
          formattedAddress: dto.formattedAddress,
          provinceName: dto.provinceName,
          cityName: dto.cityName,
          districtName: dto.districtName,
          countryCode: dto.countryCode ?? 'CN',
          latitude: dto.latitude,
          longitude: dto.longitude,
        },
      });
    }

    return this.prisma.place.create({
      data: dto,
    });
  }

  async search(query: SearchPlacesDto) {
    const [localPlaces, amapPlaces] = await Promise.all([
      this.searchLocalPlaces(query),
      this.amapWebServiceKey ? this.searchAmapPlaces(query) : Promise.resolve([]),
    ]);

    return this.mergePlaceResults(localPlaces, amapPlaces).slice(0, query.limit ?? 10);
  }

  async suggest(query: SearchPlacesDto) {
    const [localPlaces, amapPlaces] = await Promise.all([
      this.searchLocalPlaces(query),
      this.amapWebServiceKey ? this.fetchAmapInputTips(query) : Promise.resolve([]),
    ]);

    return this.mergePlaceResults(localPlaces, amapPlaces).slice(0, query.limit ?? 10);
  }

  async reverseGeocode(query: ReverseGeocodeDto) {
    if (!this.amapWebServiceKey) {
      return {
        amapConfigured: false,
        formattedAddress: null,
        recommendedPlace: null,
        nearbyPlaces: [],
      };
    }

    const params = new URLSearchParams({
      key: this.amapWebServiceKey,
      location: `${query.longitude},${query.latitude}`,
      radius: String(query.radius ?? 500),
      extensions: 'all',
      output: 'JSON',
    });

    const payload = await this.fetchAmapJson<{
      status: string;
      info: string;
      regeocode?: {
        formatted_address?: string;
        addressComponent?: {
          province?: string;
          city?: string | string[];
          district?: string;
        };
        pois?: Array<{
          id?: string;
          name?: string;
          address?: string;
          location?: string;
          pname?: string;
          cityname?: string | string[];
          adname?: string;
        }>;
      };
    }>(`https://restapi.amap.com/v3/geocode/regeo?${params.toString()}`);

    const addressComponent = payload.regeocode?.addressComponent;
    const nearbyPlaces = (payload.regeocode?.pois ?? [])
      .map((poi) => this.normalizeAmapPoi(poi))
      .filter((poi): poi is PlaceSearchResult => Boolean(poi))
      .slice(0, 8);

    return {
      amapConfigured: true,
      formattedAddress: payload.regeocode?.formatted_address ?? null,
      provinceName: normalizeAmapText(addressComponent?.province),
      cityName: normalizeAmapText(addressComponent?.city),
      districtName: normalizeAmapText(addressComponent?.district),
      recommendedPlace: nearbyPlaces[0] ?? null,
      nearbyPlaces,
    };
  }

  getProviderStatus() {
    return {
      amapConfigured: Boolean(this.amapWebServiceKey),
    };
  }

  async getStaticMapImage(query: StaticMapQueryDto): Promise<StaticMapImage> {
    if (!this.amapWebServiceKey) {
      return {
        contentType: 'text/plain; charset=utf-8',
        body: Buffer.from('AMAP_WEB_SERVICE_KEY is not configured yet.'),
      };
    }

    const mapUrl = this.buildAmapStaticMapUrl(query);
    const response = await fetch(mapUrl);

    if (!response.ok) {
      throw new BadGatewayException(`AMap static map request failed with ${response.status}`);
    }

    return {
      contentType: response.headers.get('content-type') || 'image/png',
      body: Buffer.from(await response.arrayBuffer()),
    };
  }

  private searchLocalPlaces(query: SearchPlacesDto): Promise<PlaceSearchResult[]> {
    return this.prisma.place
      .findMany({
        where: {
          name: {
            contains: query.keyword,
            mode: 'insensitive',
          },
          cityName: query.cityName
            ? {
                equals: query.cityName,
                mode: 'insensitive',
              }
            : undefined,
        },
        take: query.limit,
        orderBy: [{ cityName: 'asc' }, { updatedAt: 'desc' }],
      })
      .then((places) => places.map((place) => this.normalizeLocalPlace(place as LocalPlaceRecord)));
  }

  private async searchAmapPlaces(query: SearchPlacesDto): Promise<PlaceSearchResult[]> {
    const params = new URLSearchParams({
      key: this.amapWebServiceKey!,
      keywords: query.keyword,
      offset: String(query.limit ?? 10),
      page: '1',
      extensions: 'base',
      output: 'JSON',
    });

    if (query.cityName) {
      params.set('city', query.cityName);
    }

    if (query.cityLimit) {
      params.set('citylimit', 'true');
    }

    const payload = await this.fetchAmapJson<{
      status: string;
      info: string;
      pois?: Array<{
        id?: string;
        name?: string;
        address?: string;
        location?: string;
        pname?: string;
        cityname?: string | string[];
        adname?: string;
      }>;
    }>(`https://restapi.amap.com/v3/place/text?${params.toString()}`);

    return (payload.pois ?? [])
      .map((poi) => this.normalizeAmapPoi(poi))
      .filter((poi): poi is PlaceSearchResult => Boolean(poi));
  }

  private async fetchAmapInputTips(query: SearchPlacesDto): Promise<PlaceSearchResult[]> {
    const params = new URLSearchParams({
      key: this.amapWebServiceKey!,
      keywords: query.keyword,
      datatype: 'poi',
      output: 'JSON',
    });

    if (query.cityName) {
      params.set('city', query.cityName);
    }

    if (query.cityLimit) {
      params.set('citylimit', 'true');
    }

    if (
      typeof query.longitude === 'number' &&
      Number.isFinite(query.longitude) &&
      typeof query.latitude === 'number' &&
      Number.isFinite(query.latitude)
    ) {
      params.set('location', `${query.longitude},${query.latitude}`);
    }

    const payload = await this.fetchAmapJson<{
      status: string;
      info: string;
      tips?: Array<{
        id?: string;
        name?: string;
        district?: string;
        address?: string;
        location?: string;
      }>;
    }>(`https://restapi.amap.com/v3/assistant/inputtips?${params.toString()}`);

    return (payload.tips ?? [])
      .map((tip) => this.normalizeAmapTip(tip, query.cityName))
      .filter((poi): poi is PlaceSearchResult => Boolean(poi))
      .slice(0, query.limit ?? 10);
  }

  private async fetchAmapJson<T extends { status: string; info: string }>(url: string): Promise<T> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new BadGatewayException(`AMap request failed with ${response.status}`);
    }

    const payload = (await response.json()) as T;
    if (payload.status !== '1') {
      throw new BadGatewayException(`AMap request failed: ${payload.info}`);
    }

    return payload;
  }

  private normalizeLocalPlace(place: LocalPlaceRecord): PlaceSearchResult {
    return {
      id: place.id,
      provider: place.provider,
      providerId: place.providerId,
      name: place.name,
      shortName: place.shortName,
      formattedAddress: place.formattedAddress,
      provinceName: place.provinceName,
      cityName: place.cityName,
      districtName: place.districtName,
      countryCode: place.countryCode,
      latitude: place.latitude?.toNumber() ?? null,
      longitude: place.longitude?.toNumber() ?? null,
      source: 'local',
    };
  }

  private normalizeAmapPoi(poi: {
    id?: string;
    name?: string;
    address?: string;
    location?: string;
    pname?: string;
    cityname?: string | string[];
    adname?: string;
  }): PlaceSearchResult | null {
    if (!poi.name) {
      return null;
    }

    const coordinate = parseCoordinateString(poi.location);
    return {
      provider: PlaceProvider.AMAP,
      providerId: poi.id,
      name: poi.name,
      formattedAddress: joinAddressParts(
        normalizeAmapText(poi.pname),
        normalizeAmapText(poi.cityname),
        normalizeAmapText(poi.adname),
        normalizeAmapText(poi.address),
      ),
      provinceName: normalizeAmapText(poi.pname),
      cityName: normalizeAmapText(poi.cityname),
      districtName: normalizeAmapText(poi.adname),
      countryCode: 'CN',
      latitude: coordinate?.latitude ?? null,
      longitude: coordinate?.longitude ?? null,
      source: 'amap',
    };
  }

  private normalizeAmapTip(
    tip: {
      id?: string;
      name?: string;
      district?: string;
      address?: string;
      location?: string;
    },
    fallbackCityName?: string,
  ): PlaceSearchResult | null {
    if (!tip.name) {
      return null;
    }

    const coordinate = parseCoordinateString(tip.location);
    return {
      provider: PlaceProvider.AMAP,
      providerId: tip.id,
      name: tip.name,
      formattedAddress: joinAddressParts(normalizeAmapText(tip.district), normalizeAmapText(tip.address)),
      cityName: fallbackCityName ?? null,
      districtName: normalizeAmapText(tip.district),
      countryCode: 'CN',
      latitude: coordinate?.latitude ?? null,
      longitude: coordinate?.longitude ?? null,
      source: 'amap',
    };
  }

  private mergePlaceResults(localPlaces: PlaceSearchResult[], remotePlaces: PlaceSearchResult[]) {
    const deduped = new Map<string, PlaceSearchResult>();

    for (const place of [...remotePlaces, ...localPlaces]) {
      const key =
        place.provider === PlaceProvider.AMAP && place.providerId
          ? `amap:${place.providerId}`
          : `${place.name}:${place.latitude ?? 'na'}:${place.longitude ?? 'na'}`;

      if (!deduped.has(key)) {
        deduped.set(key, place);
      }
    }

    return [...deduped.values()];
  }

  private buildAmapStaticMapUrl(query: StaticMapQueryDto) {
    const params = new URLSearchParams({
      key: this.amapWebServiceKey!,
      size: `${clamp(query.width ?? 720, 160, 1024)}*${clamp(query.height ?? 420, 160, 1024)}`,
      scale: '2',
      traffic: query.traffic ? '1' : '0',
    });

    const routePoints = parseRouteCoordinates(query.route);
    const focusPoint = parseCoordinateString(query.focus);

    if (routePoints.length) {
      const encodedRoute = routePoints
        .map((point) => `${point.longitude},${point.latitude}`)
        .join(';');
      params.set('paths', `8,0x11443f,0.95,,:${encodedRoute}`);

      const markers: string[] = [];
      const [startPoint] = routePoints;
      const endPoint = routePoints[routePoints.length - 1];

      markers.push(`large,0x173f39,S:${startPoint.longitude},${startPoint.latitude}`);

      if (routePoints.length > 2) {
        const middlePoints = routePoints
          .slice(1, -1)
          .map((point) => `${point.longitude},${point.latitude}`)
          .join(';');
        markers.push(`small,0x11443f,:${middlePoints}`);
      }

      if (routePoints.length > 1) {
        markers.push(`large,0xD9B67D,E:${endPoint.longitude},${endPoint.latitude}`);
      }

      params.set('markers', markers.join('|'));
    } else if (focusPoint) {
      params.set('location', `${focusPoint.longitude},${focusPoint.latitude}`);
      params.set('zoom', '15');
      params.set('markers', `large,0x173f39,A:${focusPoint.longitude},${focusPoint.latitude}`);
    } else {
      params.set('location', '116.397428,39.90923');
      params.set('zoom', '11');
    }

    return `https://restapi.amap.com/v3/staticmap?${params.toString()}`;
  }
}

function normalizeAmapText(value?: string | string[] | null) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join('/');
  }

  if (!value) {
    return null;
  }

  return value;
}

function joinAddressParts(...parts: Array<string | null>) {
  const resolved = parts.filter((part): part is string => Boolean(part && part.trim()));
  return resolved.length ? resolved.join(' ') : null;
}

function parseCoordinateString(value?: string | null): Coordinate | null {
  if (!value) {
    return null;
  }

  const [longitudeRaw, latitudeRaw] = value.split(',');
  const longitude = Number(longitudeRaw);
  const latitude = Number(latitudeRaw);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return {
    longitude,
    latitude,
  };
}

function parseRouteCoordinates(value?: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split('|')
    .map((item) => parseCoordinateString(item))
    .filter((item): item is Coordinate => Boolean(item));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
