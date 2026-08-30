package com.enesucar.clinic_api.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LoginResponse {
    private String username;
    private String role;
    private String message;
}
