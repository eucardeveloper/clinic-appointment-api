# Clinic Appointment Management API

A REST API for managing clinic appointments, built with Spring Boot 3.5 and PostgreSQL.

## Technologies

- Java 21
- Spring Boot 3.5
- Spring Data JPA
- PostgreSQL
- Swagger / OpenAPI
- Maven

## Features

- Create appointment
- Get all appointments
- Get appointment by ID
- Update appointment
- Delete appointment
- Input validation
- Global error handling

## Installation

1. Clone the repository:
```bash
git clone https://github.com/eucardeveloper/klinik-terminverwaltung-api.git
```

2. Create configuration file: `src/main/resources/application.properties`

3. Add the following settings:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/klinik_terminverwaltung
spring.datasource.username=postgres
spring.datasource.password=YOUR_PASSWORD
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
```

4. Run the application:
```bash
mvn spring-boot:run
```

## API Documentation

Available after startup at: `http://localhost:8080/swagger-ui/index.html`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/termine | Get all appointments |
| GET | /api/termine/{id} | Get appointment by ID |
| POST | /api/termine | Create new appointment |
| PUT | /api/termine/{id} | Update appointment |
| DELETE | /api/termine/{id} | Delete appointment |

## Author

Enes Uçar — [github.com/eucardeveloper](https://github.com/eucardeveloper)
