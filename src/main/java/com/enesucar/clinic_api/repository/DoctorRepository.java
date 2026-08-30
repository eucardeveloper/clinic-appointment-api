package com.enesucar.clinic_api.repository;

import com.enesucar.clinic_api.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    List<Doctor> findAllByOrderByNameAsc();

    List<Doctor> findByDepartmentIdAndActiveTrue(Long departmentId);

    long countByDepartmentIdAndActiveTrue(Long departmentId);

    boolean existsByEmail(String email);
}
