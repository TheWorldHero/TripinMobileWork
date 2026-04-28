package com.tripin.api.web;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException exception) {
    return build(exception.getStatusCode().value(), exception.getReason());
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException exception) {
    String message =
        exception.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .orElse("Validation failed");
    return build(HttpStatus.BAD_REQUEST.value(), message);
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, Object>> handleGeneric(Exception exception) {
    return build(HttpStatus.INTERNAL_SERVER_ERROR.value(), exception.getMessage());
  }

  private ResponseEntity<Map<String, Object>> build(int status, String message) {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("statusCode", status);
    body.put("message", message == null || message.isBlank() ? "Request failed" : message);
    return ResponseEntity.status(status).body(body);
  }
}
