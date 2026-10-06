package com.enesucar.clinic_api.repository;

import com.enesucar.clinic_api.entity.Doctor;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    List<Doctor> findAllByOrderByNameAsc();

    List<Doctor> findByDepartmentIdAndActiveTrue(Long departmentId);

    long countByDepartmentIdAndActiveTrue(Long departmentId);

    Optional<Doctor> findFirstByNameIgnoreCaseOrderByIdAsc(String name);

    /**
     * SELECT ... FOR UPDATE on the doctor row. Booking takes this lock before checking for
     * conflicts, so concurrent bookings for one doctor are serialised and the loser gets a
     * clean 409 instead of a constraint violation. Same pattern as the WMS product lock.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Doctor d WHERE d.id = :id")
    Optional<Doctor> findByIdForUpdate(@Param("id") Long id);

    boolean existsByEmail(String email);
	
	boolean existsByUsername(String username);
}
