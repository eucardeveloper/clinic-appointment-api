package com.enesucar.clinic_api.dto;

import lombok.Getter;

import java.util.List;

/**
 * Generic paginated response wrapper.
 * Provides metadata the frontend needs to render pagination controls.
 */
@Getter
public class PagedResponse<T> {

    private final List<T> content;
    private final int page;
    private final int size;
    private final long totalElements;
    private final int totalPages;
    private final boolean last;

    public PagedResponse(org.springframework.data.domain.Page<T> page) {
        this.content       = page.getContent();
        this.page          = page.getNumber();
        this.size          = page.getSize();
        this.totalElements = page.getTotalElements();
        this.totalPages    = page.getTotalPages();
        this.last          = page.isLast();
    }
}
