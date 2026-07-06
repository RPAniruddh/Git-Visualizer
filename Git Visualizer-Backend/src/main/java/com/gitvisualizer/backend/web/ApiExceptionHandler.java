package com.gitvisualizer.backend.web;

import com.gitvisualizer.backend.dto.ErrorResponseDto;
import com.gitvisualizer.backend.service.NotFoundException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponseDto> handleNotFound(NotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler({ConstraintViolationException.class, MethodArgumentNotValidException.class})
    public ResponseEntity<ErrorResponseDto> handleValidation(Exception ex) {
        String message = ex instanceof ConstraintViolationException cve
                ? cve.getConstraintViolations().stream()
                        .map(v -> v.getMessage())
                        .sorted()
                        .reduce((a, b) -> a + "; " + b)
                        .orElse("Validation failed")
                : "Validation failed";
        return error(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseEntity<ErrorResponseDto> error(HttpStatus status, String message) {
        return ResponseEntity.status(status)
                .body(new ErrorResponseDto(Instant.now(), status.value(), status.getReasonPhrase(), message));
    }
}
