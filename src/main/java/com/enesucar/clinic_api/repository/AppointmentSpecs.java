package com.enesucar.clinic_api.repository;

import com.enesucar.clinic_api.entity.Appointment;
import com.enesucar.clinic_api.entity.AppointmentStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Optional appointment filters built as a Criteria query: a filter that is not set adds no
 * predicate at all. The previous JPQL form ("(:x IS NULL OR col = :x)") makes PostgreSQL fail with
 * "could not determine data type of parameter" as soon as a bound value is null.
 */
public final class AppointmentSpecs {

    private AppointmentSpecs() {}

    /**
     * @param doctorPattern lower-cased LIKE pattern using '!' as escape character, or null for no filter
     * @param patientUsername restrict to one patient (null = no restriction)
     * @param doctorId restrict to one doctor (null = no restriction)
     */
    public static Specification<Appointment> filtered(AppointmentStatus status, String doctorPattern,
                                                      LocalDateTime from, LocalDateTime to,
                                                      String patientUsername, Long doctorId) {
        return (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (status != null) p.add(cb.equal(root.get("status"), status));
            if (doctorPattern != null) p.add(cb.like(cb.lower(root.get("doctorName")), doctorPattern, '!'));
            if (from != null) p.add(cb.greaterThanOrEqualTo(root.get("appointmentTime"), from));
            if (to != null) p.add(cb.lessThanOrEqualTo(root.get("appointmentTime"), to));
            if (patientUsername != null) p.add(cb.equal(root.get("patientUsername"), patientUsername));
            if (doctorId != null) p.add(cb.equal(root.get("doctorId"), doctorId));
            return cb.and(p.toArray(new Predicate[0]));
        };
    }
}
