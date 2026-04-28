'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { api } from '../lib/api';
import type { TripDraft, UserSummary } from '../types';

function formatTripStatus(status?: string | null) {
  switch ((status ?? 'DRAFT').toUpperCase()) {
    case 'PUBLISHED':
      return '已发布';
    case 'READY':
      return '待发布';
    case 'EDITING':
      return '编辑中';
    default:
      return '草稿';
  }
}

export function TripStudioHome({
  initialTrips,
  currentUser,
}: {
  initialTrips: TripDraft[];
  currentUser: UserSummary;
}) {
  const router = useRouter();
  const [trips, setTrips] = useState(initialTrips);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [cityName, setCityName] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCreating, startCreating] = useTransition();

  const createTrip = () => {
    if (!title.trim()) {
      setFeedback('先给这条路线起个名字。');
      return;
    }

    startCreating(() => {
      void (async () => {
        try {
          const trip = await api.createTrip({
            title: title.trim(),
            summary: summary.trim() || undefined,
            cityName: cityName.trim() || undefined,
          });
          setTrips((currentTrips) => [trip, ...currentTrips]);
          setTitle('');
          setSummary('');
          setCityName('');
          setFeedback('草稿已创建，现在可以进地图工作台继续编辑。');
          router.push(`/studio/${trip.id}`);
          router.refresh();
        } catch (error) {
          setFeedback(error instanceof Error ? error.message : '创建草稿失败。');
        }
      })();
    });
  };

  return (
    <main className="site-shell studio-page">
      <section className="studio-card studio-card-wide">
        <p className="eyebrow">TripIn 工作台</p>
        <h1 className="page-title studio-page-title">从地图开始，把一条路线做出来。</h1>
        <p className="hero-copy">
          当前用户是 {currentUser.displayName}。先创建草稿，然后在地图里搜点、加点、选时间段，最后直接发布到主页。
        </p>
      </section>

      <section className="studio-card studio-card-wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">新建路线</p>
            <h2 className="section-title">先建一个可继续编辑的草稿</h2>
          </div>
        </div>
        <div className="studio-form">
          <label className="studio-field">
            <span>路线标题</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="比如：杭州两天慢游"
            />
          </label>
          <label className="studio-field">
            <span>城市</span>
            <input
              value={cityName}
              onChange={(event) => setCityName(event.target.value)}
              placeholder="杭州"
            />
          </label>
          <label className="studio-field">
            <span>一句话描述</span>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
              placeholder="这条路线大概想记录什么"
            />
          </label>
          <div className="studio-inline-actions">
            <button className="editor-button editor-button-primary" type="button" onClick={createTrip}>
              {isCreating ? '正在创建...' : '创建草稿'}
            </button>
            <Link className="editor-button" href="/">
              返回首页
            </Link>
          </div>
          {feedback ? <p className="editor-feedback">{feedback}</p> : null}
        </div>
      </section>

      <section className="studio-card studio-card-wide">
        <div className="section-heading">
          <div>
            <p className="eyebrow">我的路线</p>
            <h2 className="section-title">继续上次没做完的内容</h2>
          </div>
        </div>
        <div className="studio-list">
          {trips.length ? (
            trips.map((trip) => (
              <article key={trip.id} className="studio-list-item">
                <div className="studio-list-copy">
                  <div className="meta-list">
                    <span className="meta-chip">{formatTripStatus(trip.status)}</span>
                    <span>{trip.pointCount} 个点</span>
                    {trip.cityName ? <span>{trip.cityName}</span> : null}
                  </div>
                  <h3>{trip.title}</h3>
                  <p>{trip.summary ?? '还没有描述，进工作台继续把点位和图片补起来。'}</p>
                </div>
                <div className="studio-list-actions">
                  <Link className="editor-button editor-button-primary" href={`/studio/${trip.id}`}>
                    进入编辑
                  </Link>
                  {trip.post?.id ? (
                    <Link className="editor-button" href={`/routes/${trip.post.id}`}>
                      查看已发布页面
                    </Link>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="empty-panel">
              <p className="eyebrow">还没有草稿</p>
              <p className="section-copy">先创建第一条路线，下面就会开始积累你的草稿列表。</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
