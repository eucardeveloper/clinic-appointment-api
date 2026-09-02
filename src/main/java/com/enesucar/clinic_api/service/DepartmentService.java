package com.enesucar.clinic_api.service;

import com.enesucar.clinic_api.dto.DepartmentRequest;
import com.enesucar.clinic_api.dto.DepartmentResponse;
import com.enesucar.clinic_api.entity.Department;
import com.enesucar.clinic_api.repository.DepartmentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class DepartmentService {

    private final DepartmentRepository departmentRepository;

    public DepartmentService(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> findAll() {
        return departmentRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public DepartmentResponse create(DepartmentRequest request) {
        if (departmentRepository.existsByName(request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A department with this name already exists");
        }

        Department dept = new Department();
        dept.setName(request.name());
        dept.setFloor(request.floor());
        dept.setHeadDoctor(request.headDoctor());

        return toResponse(departmentRepository.save(dept));
    }


    public DepartmentResponse update(Long id, DepartmentRequest request) {
        Department dept = departmentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Department not found"));

        // Allow rename only if the new name doesn't conflict with another department
        if (!dept.getName().equals(request.name()) && departmentRepository.existsByName(request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A department with this name already exists");
        }

        dept.setName(request.name());
        dept.setFloor(request.floor());
        dept.setHeadDoctor(request.headDoctor());

        return toResponse(departmentRepository.save(dept));
    }

    public void delete(Long id) {
        if (!departmentRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found");
        }
        departmentRepository.deleteById(id);
    }

    private DepartmentResponse toResponse(Department d) {
        long activeDoctors = departmentRepository.countActiveDoctorsByDepartmentId(d.getId());
        return new DepartmentResponse(d.getId(), d.getName(), d.getFloor(),
                d.getHeadDoctor(), activeDoctors);
    }
}
