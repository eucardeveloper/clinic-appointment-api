package com.enesucar.clinic_api.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "department")
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private Integer floor;

    private String headDoctor;

    public Department() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getFloor() { return floor; }
    public void setFloor(Integer floor) { this.floor = floor; }

    public String getHeadDoctor() { return headDoctor; }
    public void setHeadDoctor(String headDoctor) { this.headDoctor = headDoctor; }
}
