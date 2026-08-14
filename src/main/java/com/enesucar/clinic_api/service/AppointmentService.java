package com.enesucar.clinic_api.service;

import com.enesucar.clinic_api.dto.AppointmentRequest;
import com.enesucar.clinic_api.dto.AppointmentResponse;
import com.enesucar.clinic_api.entity.Appointment;
import com.enesucar.clinic_api.exception.AppointmentNotFoundException;
import com.enesucar.clinic_api.repository.AppointmentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;

    public AppointmentService(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    public List<AppointmentResponse> getAllAppointments() {
        return appointmentRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public AppointmentResponse saveAppointment(AppointmentRequest request) {
        Appointment appointment = new Appointment();
        appointment.setPatientName(request.getPatientName());
        appointment.setDoctorName(request.getDoctorName());
        appointment.setAppointmentTime(request.getAppointmentTime());
        appointment.setDepartment(request.getDepartment());
        Appointment saved = appointmentRepository.save(appointment);
        return toResponse(saved);
    }

    public AppointmentResponse findAppointment(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException(id));
        return toResponse(appointment);
    }

    public AppointmentResponse updateAppointment(Long id, AppointmentRequest request) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new AppointmentNotFoundException(id));
        appointment.setPatientName(request.getPatientName());
        appointment.setDoctorName(request.getDoctorName());
        appointment.setAppointmentTime(request.getAppointmentTime());
        appointment.setDepartment(request.getDepartment());
        Appointment saved = appointmentRepository.save(appointment);
        return toResponse(saved);
    }

    public void deleteAppointment(Long id) {
        if (!appointmentRepository.existsById(id)) {
            throw new AppointmentNotFoundException(id);
        }
        appointmentRepository.deleteById(id);
    }

    private AppointmentResponse toResponse(Appointment appointment) {
        AppointmentResponse response = new AppointmentResponse();
        response.setId(appointment.getId());
        response.setPatientName(appointment.getPatientName());
        response.setDoctorName(appointment.getDoctorName());
        response.setAppointmentTime(appointment.getAppointmentTime());
        response.setDepartment(appointment.getDepartment());
        return response;
    }
}
