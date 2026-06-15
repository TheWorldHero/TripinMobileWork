package com.tripin.api.mq;

import com.tripin.api.service.NotificationService;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.stream.StreamMessageListenerContainer;
import org.springframework.data.redis.stream.StreamMessageListenerContainer.StreamMessageListenerContainerOptions;
import org.springframework.stereotype.Component;

/**
 * Redis Streams 消费者：以消费者组方式读取领域事件，交给 {@link NotificationService} 落成通知。
 *
 * <p>启动时先 ping Redis：不可达则不启动容器，仅打一条 warn，事件改由 {@link EventPublisher} 同步处理。
 */
@Component
public class MqConsumer {
  private static final Logger log = LoggerFactory.getLogger(MqConsumer.class);

  private final RedisConnectionFactory connectionFactory;
  private final StringRedisTemplate redis;
  private final NotificationService notifications;
  private final MqStatus status;
  private final boolean enabled;
  private final String streamKey;
  private final String group;
  private final String consumerName;

  private StreamMessageListenerContainer<String, MapRecord<String, String, String>> container;

  public MqConsumer(
      RedisConnectionFactory connectionFactory,
      StringRedisTemplate redis,
      NotificationService notifications,
      MqStatus status,
      @Value("${TRIPIN_MQ_ENABLED:true}") boolean enabled,
      @Value("${TRIPIN_MQ_STREAM:tripin:events}") String streamKey,
      @Value("${TRIPIN_MQ_GROUP:tripin-workers}") String group,
      @Value("${TRIPIN_MQ_CONSUMER:worker-1}") String consumerName) {
    this.connectionFactory = connectionFactory;
    this.redis = redis;
    this.notifications = notifications;
    this.status = status;
    this.enabled = enabled;
    this.streamKey = streamKey;
    this.group = group;
    this.consumerName = consumerName;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void start() {
    if (!enabled) {
      log.info("MQ disabled (TRIPIN_MQ_ENABLED=false); events handled synchronously");
      return;
    }
    if (!pingRedis()) {
      log.warn("MQ consumer not started — Redis unavailable; events handled synchronously");
      return;
    }

    ensureGroup();

    StreamMessageListenerContainerOptions<String, MapRecord<String, String, String>> options =
        StreamMessageListenerContainerOptions.builder().pollTimeout(Duration.ofSeconds(2)).build();
    container = StreamMessageListenerContainer.create(connectionFactory, options);
    container.receiveAutoAck(
        Consumer.from(group, consumerName),
        StreamOffset.create(streamKey, ReadOffset.lastConsumed()),
        this::onMessage);
    container.start();
    status.setAvailable(true);
    log.info(
        "MQ consumer started (stream={}, group={}, consumer={})", streamKey, group, consumerName);
  }

  private boolean pingRedis() {
    RedisConnection connection = null;
    try {
      connection = connectionFactory.getConnection();
      connection.ping();
      return true;
    } catch (Exception exception) {
      return false;
    } finally {
      if (connection != null) {
        try {
          connection.close();
        } catch (Exception ignored) {
          // best-effort close
        }
      }
    }
  }

  private void ensureGroup() {
    try {
      redis.opsForStream().createGroup(streamKey, ReadOffset.from("0"), group);
    } catch (Exception first) {
      // Stream may not exist yet, or the group already exists. Seed the stream then retry once.
      try {
        redis
            .opsForStream()
            .add(StreamRecords.mapBacked(Map.of("type", "__init__")).withStreamKey(streamKey));
        redis.opsForStream().createGroup(streamKey, ReadOffset.from("0"), group);
      } catch (Exception ignored) {
        // group now exists — fine
      }
    }
  }

  private void onMessage(MapRecord<String, String, String> record) {
    try {
      notifications.handle(DomainEvent.fromMap(record.getValue()));
    } catch (Exception exception) {
      log.warn("Failed handling event {}: {}", record.getId(), exception.getMessage());
    }
  }

  @PreDestroy
  public void stop() {
    if (container != null) {
      container.stop();
    }
  }
}
