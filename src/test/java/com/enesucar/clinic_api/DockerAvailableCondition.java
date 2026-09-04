package com.enesucar.clinic_api;

import org.junit.jupiter.api.extension.ConditionEvaluationResult;
import org.junit.jupiter.api.extension.ExecutionCondition;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.testcontainers.DockerClientFactory;

/**
 * JUnit 5 execution condition that skips a test when Testcontainers cannot
 * reach a Docker daemon. Uses the same connectivity check that Testcontainers
 * itself performs, so a "docker info" success is not a false positive on
 * Windows Docker Desktop WSL2 backends where named pipes return Status 400.
 *
 * Attach with {@code @ExtendWith(DockerAvailableCondition.class)}.
 */
public class DockerAvailableCondition implements ExecutionCondition {

    @Override
    public ConditionEvaluationResult evaluateExecutionCondition(ExtensionContext context) {
        try {
            boolean available = DockerClientFactory.instance().isDockerAvailable();
            if (available) {
                return ConditionEvaluationResult.enabled("Docker is reachable via Testcontainers");
            } else {
                return ConditionEvaluationResult.disabled(
                        "Docker daemon not reachable by Testcontainers — test skipped locally");
            }
        } catch (Exception e) {
            return ConditionEvaluationResult.disabled(
                    "Docker check failed (" + e.getMessage() + ") — test skipped locally");
        }
    }
}
