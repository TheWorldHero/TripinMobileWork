package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class SchemaSqlCompatibilityTest {

  /**
   * schema.sql uses dollar-quoted DO blocks, which Spring's SQL init would split incorrectly on
   * semicolons. That is safe only because the schema is applied via psql (docker-entrypoint-initdb
   * mount and `npm run db:init`), never via Spring. Guard that assumption here.
   */
  @Test
  void springSqlInitStaysDisabledWhileSchemaUsesDollarQuotedBlocks() throws IOException {
    String schema =
        new String(
            new ClassPathResource("schema.sql").getInputStream().readAllBytes(),
            StandardCharsets.UTF_8);

    Properties properties = new Properties();
    properties.load(new ClassPathResource("application.properties").getInputStream());

    if (schema.contains("DO $$")) {
      assertTrue(
          "never".equals(properties.getProperty("spring.sql.init.mode")),
          "schema.sql contains dollar-quoted DO blocks; spring.sql.init.mode must stay 'never'"
              + " because Spring SQL init splits them incorrectly (apply schema via psql instead)");
    } else {
      assertFalse(schema.isBlank(), "schema.sql must not be empty");
    }
  }
}
