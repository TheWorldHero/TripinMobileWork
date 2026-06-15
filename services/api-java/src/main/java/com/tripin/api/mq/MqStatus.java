package com.tripin.api.mq;

import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.stereotype.Component;

/**
 * 消息队列可用性的共享开关。
 *
 * <p>由 {@link MqConsumer} 在启动时根据能否连上 Redis 设置；{@link EventPublisher} 据此决定
 * 走异步（Redis Streams）还是同步降级，避免 Redis 不可用时每次请求都去尝试连接拖慢响应。
 */
@Component
public class MqStatus {
  private final AtomicBoolean available = new AtomicBoolean(false);

  public boolean isAvailable() {
    return available.get();
  }

  public void setAvailable(boolean value) {
    available.set(value);
  }
}
