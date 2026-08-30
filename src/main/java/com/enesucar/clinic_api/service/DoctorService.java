package com.enesucar.clinic_api.service;

import com.enesucar.clinic_api.dto.DoctorRequest;
import com.enesucar.clinic_api.dto.DoctorResponse;
import com.enesucar.clinic_api.entity.Department;
import com.enesucar.clinic_api.entity.Doctor;
import com.enesucar.clinic_api.repository.DepartmentRepository;
import com.enesucar.clinic_api.repository.DoctorRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final DepartmentRepository departmentRepository;

    public DoctorService(DoctorRepository doctorRepository,
                         DepartmentRepository departmentRepository) {
        this.doctorRepository = doctorRepository;
        this.departmentRepository = departmentRepository;
    }

    @Transactional(readOnly = true)
    public List<DoctorResponse> findAll() {
        return doctorRepository.findAllByOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public DoctorResponse create(DoctorRequest request) {
        if (doctorRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A doctor with this email already exists");
        }

        Doctor doctor = new Doctor();
        doctor.setName(request.name());
        doctor.setEmail(request.email());
        doctor.setPhone(request.phone());
        doctor.setActive(true);

        if (request.departmentId() != null) {
            Department dept = departmentRepository.findById(request.departmentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                            "Department not found"));
            doctor.setDepartment(dept);
        }

        return toResponse(doctorRepository.save(doctor));
    }

    public DoctorResponse toggleStatus(Long id, boolean active) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Doctor not found"));
        doctor.setActive(active);
        return toResponse(doctorRepository.save(doctor));
    }

    public void delete(Long id) {
        if (!doctorRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found");
        }
        doctorRepository.deleteById(id);
    }

    private DoctorResponse toResponse(Doctor d) {
        String deptName = d.getDepartment() != null ? d.getDepartment().getName() : null;
        Long deptId = d.getDepartment() != null ? d.getDepartment().getId() : null;
        return new DoctorResponse(d.getId(), d.getName(), deptId, deptName,
                d.getEmail(), d.getPhone(), d.isActive());
    }
}
