import { requireNativeView } from 'expo';
import type { StyleProp, ViewStyle } from 'react-native';

export type TripinMapCoordinate = {
  latitude: number;
  longitude: number;
};

export type TripinMapMarker = TripinMapCoordinate & {
  id: string;
  title?: string;
  subtitle?: string;
};

export type TripinMapPolyline = {
  id: string;
  coordinates: TripinMapCoordinate[];
  color?: string;
  width?: number;
};

export type TripinAmapViewProps = {
  style?: StyleProp<ViewStyle>;
  markers?: TripinMapMarker[];
  polylines?: TripinMapPolyline[];
};

const NativeTripinAmapView = requireNativeView<TripinAmapViewProps>('TripinAmap');

export default NativeTripinAmapView;
