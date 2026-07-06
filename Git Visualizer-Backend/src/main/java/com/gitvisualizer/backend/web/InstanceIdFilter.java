package com.gitvisualizer.backend.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * Tags every response with X-Instance-Id (container hostname) so the
 * load-balancer round-robin distribution can be verified from curl.
 */
@Component
public class InstanceIdFilter extends OncePerRequestFilter {

    public static final String INSTANCE_HEADER = "X-Instance-Id";

    private final String instanceId;

    public InstanceIdFilter() {
        this.instanceId = resolveInstanceId();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        response.setHeader(INSTANCE_HEADER, instanceId);
        filterChain.doFilter(request, response);
    }

    private static String resolveInstanceId() {
        String hostname = System.getenv("HOSTNAME");
        if (hostname != null && !hostname.isBlank()) {
            return hostname;
        }
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (UnknownHostException e) {
            return "unknown";
        }
    }
}
