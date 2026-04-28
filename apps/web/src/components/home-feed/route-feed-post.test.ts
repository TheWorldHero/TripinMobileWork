import * as React from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { buildHomeFeedPosts } from '../../home-feed/demo-posts';
import { RouteFeedPost } from './RouteFeedPost';

globalThis.React = React;

describe('RouteFeedPost', () => {
  test('renders portrait media before the route map and keeps the address below the map', () => {
    const post = buildHomeFeedPosts([])[0];

    expect(post).toBeDefined();

    const html = renderToStaticMarkup(createElement(RouteFeedPost, { post }));
    const imageIndex = html.indexOf(`alt="${post.title} - ${post.stops[0]?.title}"`);
    const mapIndex = html.indexOf(`aria-label="${post.title} 路线图"`);
    const addressIndex = html.indexOf(post.stops[0]?.placeLabel ?? '');

    expect(imageIndex).toBeGreaterThan(-1);
    expect(mapIndex).toBeGreaterThan(imageIndex);
    expect(addressIndex).toBeGreaterThan(mapIndex);
  });

  test('keeps feed actions minimal and removes point-list affordances', () => {
    const post = buildHomeFeedPosts([])[0];
    const html = renderToStaticMarkup(createElement(RouteFeedPost, { post }));

    expect(html).toContain('aria-label="点赞"');
    expect(html).toContain('aria-label="评论"');
    expect(html).not.toContain('路线点位列表');
    expect(html).not.toContain('翻开完整路线');
  });

  test('renders image arrows and clickable stop buttons for interactive posts', () => {
    const post = buildHomeFeedPosts([]).find((item) => item.stops.length >= 3);

    expect(post).toBeDefined();

    const html = renderToStaticMarkup(createElement(RouteFeedPost, { post: post! }));

    expect(html).toContain('aria-label="下一张图片"');
    expect(html).toContain(`aria-label="切换到 ${post!.stops[0]?.title}"`);
    expect(html).toContain(`aria-label="切换到 ${post!.stops[1]?.title}"`);
  });
});
