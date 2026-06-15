package com.tripin.api.mq;

import com.tripin.api.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * 领域事件发布器。
 *
 * <p>Redis 可用时把事件 XADD 进 Stream，由 {@link MqConsumer} 异步消费（解耦点赞/评论/关注
 * 与通知写入）。Redis 不可用（本地无 Redis 或连接失败）时自动降级为同步处理，保证通知不丢。
 */
@Component
public class EventPublisher {
  private static final Logger log = LoggerFactory.getLogger(EventPublisher.class);

  private final StringRedisTemplate redis;
  private final MqStatus status;
  private final NotificationService notifications;
  private final String streamKey;
  private final boolean enabled;

  public EventPublisher(
      StringRedisTemplate redis,
      MqStatus status,
      NotificationService notifications,
      @Value("${TRIPIN_MQ_STREAM:tripin:events}") String streamKey,
      @Value("${TRIPIN_MQ_ENABLED:true}") boolean enabled) {
    this.redis = redis;
    this.status = status;
    this.notifications = notifications;
    this.streamKey = streamKey;
    this.enabled = enabled;
  }

  public void publish(DomainEvent event) {
    if (event == null) {
      return;
    }
    if (enabled && status.isAvailable()) {
      try {
        redis.opsForStream().add(StreamRecords.mapBacked(event.toMap()).withStreamKey(streamKey));
        return;
      } catch (Exception exception) {
        log.warn(
            "MQ publish failed ({}); handling event synchronously", exception.getMessage());
        status.setAvailable(false);
      }
    }
    handleSynchronously(event);
  }

  private void handleSynchronously(DomainEvent event) {
    try {
      notifications.handle(event);
    } catch (Exception exception) {
      log.warn("Synchronous event handling failed: {}", exception.getMessage());
    }
  }
}
