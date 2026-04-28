package com.tripin.api.support;

import static org.junit.jupiter.api.Assertions.assertFalse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class SchemaSqlCompatibilityTest {

  @Test
  void schemaDoesNotUseDollarQuotedDoBlocks() throws IOException {
    ClassPathResource resource = new ClassPathResource("schema.sql");
    String schema = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

    assertFalse(
        schema.contains("DO $$"),
        "schema.sql must avoid dollar-quoted DO blocks because Spring SQL init splits them incorrectly");
  }
}
