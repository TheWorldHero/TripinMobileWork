'use client';

import { useEffect, useState } from 'react';

import { api } from '../../lib/api';
import type { UserPreferences } from '../../types';
import { TopBar } from '../shell/TopBar';

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`switch ${checked ? 'on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="switch-knob" />
    </button>
  );
}

export function PreferencesScreen() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .getPreferences()
      .then((value) => {
        if (active) setPrefs(value);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : '加载偏好失败');
      });
    return () => {
      active = false;
    };
  }, []);

  const patch = async (partial: Partial<Omit<UserPreferences, 'userId'>>) => {
    if (!prefs) return;
    const optimistic = { ...prefs, ...partial };
    setPrefs(optimistic);
    setSaving(true);
    setError(null);
    try {
      const saved = await api.updatePreferences(partial);
      setPrefs(saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <TopBar title="设置" back>
        {saving ? <span className="topbar-action muted">保存中…</span> : null}
      </TopBar>

      {error ? <div className="notice error">{error}</div> : null}

      {!prefs ? (
        <div className="empty-state">
          <span>加载中…</span>
        </div>
      ) : (
        <>
          <div className="pref-group">
            <div className="pref-group-title">通知</div>
            <div className="pref-row">
              <div className="pref-row-text">
                <b>点赞通知</b>
                <span>有人点赞你的帖子时通知你</span>
              </div>
              <Toggle
                checked={prefs.notifyLikes}
                disabled={saving}
                onChange={(value) => patch({ notifyLikes: value })}
              />
            </div>
            <div className="pref-row">
              <div className="pref-row-text">
                <b>评论通知</b>
                <span>有人评论你的帖子时通知你</span>
              </div>
              <Toggle
                checked={prefs.notifyComments}
                disabled={saving}
                onChange={(value) => patch({ notifyComments: value })}
              />
            </div>
            <div className="pref-row">
              <div className="pref-row-text">
                <b>关注通知</b>
                <span>有人关注你时通知你</span>
              </div>
              <Toggle
                checked={prefs.notifyFollows}
                disabled={saving}
                onChange={(value) => patch({ notifyFollows: value })}
              />
            </div>
          </div>

          <div className="pref-group">
            <div className="pref-group-title">首页内容</div>
            <div className="pref-segment">
              <button
                type="button"
                className={`pref-segment-btn ${prefs.feedScope === 'all' ? 'active' : ''}`}
                onClick={() => patch({ feedScope: 'all' })}
                disabled={saving}
              >
                推荐全部
              </button>
              <button
                type="button"
                className={`pref-segment-btn ${prefs.feedScope === 'following' ? 'active' : ''}`}
                onClick={() => patch({ feedScope: 'following' })}
                disabled={saving}
              >
                只看关注
              </button>
            </div>
            <p className="pref-hint">
              「只看关注」会在首页优先展示你关注的人的内容（需要后端开启对应过滤）。
            </p>
          </div>
        </>
      )}
    </div>
  );
}
