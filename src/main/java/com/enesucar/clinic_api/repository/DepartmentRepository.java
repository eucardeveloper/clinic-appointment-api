package com.enesucar.clinic_api.repository;

import com.enesucar.clinic_api.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {

    boolean existsByName(String name);

    @Query("SELECT COUNT(d) FROM Doctor d WHERE d.department.id = :departmentId AND d.active = true")
    long countActiveDoctorsByDepartmentId(Long departmentId);
}
