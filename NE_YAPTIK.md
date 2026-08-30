# Clinic Appointment API — Ne Yaptık Dokümanı

---

## 1. Proje Özeti (CV için İngilizce)

> Built a production-grade clinic appointment REST API using Spring Boot 3, Java 21, and PostgreSQL, featuring a state machine for appointment lifecycle management, JWT authentication via httpOnly cookies (BFF pattern), RFC 7807 standardized error responses, Flyway database migrations, and a Next.js 15 frontend with real-time status transitions. Designed as a deliberate monolith with documented architectural rationale.

---

## 2. Teknik Kararlar

### State Machine (AppointmentStatus enum)
**Ne yaptık:** Geçiş kurallarını `AppointmentStatus` enum'unun içinde `Map.of(...)` ile tanımladık. Her durum kendi geçiş listesini biliyor.

**Neden:** Alternatif, service katmanında `if-else` zinciri yazıp oraya koymaktı. Bu şu sorunu yaratır: yeni bir durum eklendiğinde (örn. `RESCHEDULED`) birden fazla yerde değişiklik gerekir. Enum içinde tutunca **tek nokta değişim** (single source of truth) prensibi korunur. Yanlış bir geçiş yazmak derleme zamanında değil runtime'da yakalanır ama en azından test edilmesi kolaydır.

**Alternatif:** Spring State Machine kütüphanesi. Çok büyük projeler için mantıklı ama bu ölçekte over-engineering olurdu.

---

### allowedTransitions Pattern
**Ne yaptık:** Her API yanıtında o appointment'ın geçebileceği durumları liste olarak döndürüyoruz.

**Neden:** Frontend hangi butonları göstereceğini backend'den öğreniyor. Böylece frontend'de hiç business logic yok — sadece butonu render edip etmemeye karar veriyor. Roller değiştiğinde, yeni durum eklendiğinde frontend kodu değişmez.

**Alternatif:** Frontend rollere göre kendi hesaplasaydı. Sorun: rol mantığı iki yerde olurdu, senkron kalmak zorunda kalınırdı.

---

### httpOnly Cookie / BFF Pattern
**Ne yaptık:** JWT'yi `localStorage`'a değil httpOnly cookie'ye koyuyoruz. `AuthController` login'de cookie set ediyor, logout'ta temizliyor.

**Neden:** `localStorage`'daki token JavaScript ile okunabilir, yani XSS saldırısında çalınabilir. httpOnly cookie JavaScript tarafından okunamaz — sadece browser HTTP request'lerine otomatik ekler.

**Alternatif:** `localStorage` + `Authorization: Bearer` header. Kullanımı kolay ama XSS'e açık.

---

### Çakışma Kontrolü (Conflict Detection)
**Ne yaptık:** Aynı doktorun aynı zaman diliminde (±30 dakika) aktif randevusu varsa `409 Conflict` fırlatıyoruz. CANCELLED ve NO_SHOW durumlar "boş slot" sayılıyor.

**Neden:** Veritabanında `UNIQUE` constraint yetmez — zaman aralığı kontrolü uygulama katmanında yapılmalı. Ayrıca güncelleme (`PUT`) sırasında kendi kendisiyle çakışmaması için `excludeId` parametresi var.

**Alternatif:** Veritabanı seviyesinde `EXCLUDE` constraint (PostgreSQL). Daha güçlü ama daha az anlaşılır.

---

### Flyway Migrations
**Ne yaptık:** `V1__create_appointments.sql`, `V2__add_status.sql`, `V3__create_app_user.sql`, `V4__seed_appointments.sql` — her değişiklik versiyonlanmış.

**Neden:** `spring.jpa.hibernate.ddl-auto=update` production'da tehlikeli — tablo sütunu silebilir, veri kaybı yaratabilir. Flyway tam kontrol sağlar, geri alınamaz değişiklikler versiyonda görünür.

**Alternatif:** Liquibase. Daha güçlü ama Flyway SQL tabanlı olduğu için daha okunabilir.

---

### RFC 7807 ProblemDetail
**Ne yaptık:** Tüm hatalar standart `ProblemDetail` formatında dönüyor: `type`, `title`, `status`, `detail`, ve gerektiğinde `fieldErrors`.

**Neden:** Önceki implementasyonda hatalar kimi zaman `String`, kimi zaman `Map` dönüyordu. Frontend bunu parse etmek için her endpoint için ayrı kod yazmak zorundaydı. RFC 7807 ile tüm hatalar aynı şemada — `type` alanına göre switch yapılabilir.

**Alternatif:** Custom error response DTO. Aynı sonucu verir ama standart değil.

---

### Next.js App Router + Rewrites
**Ne yaptık:** `next.config.ts` içinde `/api/*` path'lerini backend'e proxy'liyor. Frontend `credentials: 'include'` ile cookie'yi otomatik gönderir.

**Neden:** CORS sorununu elimine eder. Frontend ve backend farklı port'larda çalışsa da browser aynı origin görür.

---

### Monolith Kararı
**Ne yaptık:** Kafka, microservice yok. Tek uygulama, tek deploy.

**Neden:** Bu domain'de gerçek bir async sınır yok. "Randevu oluştur → bildirim gönder" gibi bir ihtiyaç olsaydı Kafka düşünülebilirdi. Şimdi eklemek complexity theater olurdu. README'de bu karar savunuldu.

---

## 3. Mülakat Soruları ve Cevapları

### BACKEND

**S1: State machine'i neden enum'a koydunuz, service'e değil?**
Cevap: Single source of truth. Geçiş kuralı state'e ait bir bilgi — state kendisi bilmeli. Service'te if-else olsaydı yeni durum eklenince birden fazla yer değişirdi. Enum içinde `Map.of(...)` ile tanımlanınca değişiklik tek noktada.

**S2: `@Transactional` neden sadece bazı metotlarda var?**
Cevap: Read-only işlemler için transaction açmak gereksiz overhead. `transitionStatus` ve `save` işlemleri birden fazla DB operasyonu içerdiği için atomik olmalı — transaction orada zorunlu.

**S3: Çakışma kontrolünde neden veritabanı constraint değil uygulama kodu kullandınız?**
Cevap: Zaman aralığı kontrolü SQL `UNIQUE` ile yapılamaz. PostgreSQL `EXCLUDE` constraint mümkün ama anlaşılması zor. Uygulama katmanı daha test edilebilir ve CANCELLED/NO_SHOW istisnaları eklemek daha kolay.

**S4: JWT secret'ı application.properties'te neden görmek rahatsız edici?**
Cevap: Default değer var ama `${JWT_SECRET:...}` ile environment variable'dan okunuyor. Production'da env var set edilmeli, properties'teki değer asla kullanılmamalı.

**S5: `ddl-auto=validate` ne işe yarar?**
Cevap: Hibernate şemayı değiştirmez, sadece entity ile mevcut şemanın uyuşup uyuşmadığını kontrol eder. Flyway şemayı yönetir, Hibernate dokunmaz. Production'da güvenli.

**S6: ProblemDetail'de `type` URI'si ne işe yarar?**
Cevap: Frontend bunu programatik olarak işleyebilir — string mesaja göre switch yerine URI'ya göre switch. Aynı zamanda dokümantasyon URL'i olabilir.

**S7: `checkConflict` metodunda `excludeId = -1L` neden?**
Cevap: Yeni kayıtta hiçbir appointment ID'si exclude edilmemeli. -1 asla gerçek bir ID olmaz (PostgreSQL BIGSERIAL 1'den başlar). Alternatif `Optional<Long>` kullanmak ama query daha karmaşık olurdu.

**S8: `@EnableMethodSecurity` ne sağlar?**
Cevap: `@PreAuthorize("hasRole('ADMIN')")` gibi metot seviyesi güvenlik annotation'larını aktive eder. SecurityConfig'teki URL tabanlı kurallarla birlikte çalışır.

---

### FRONTEND

**S9: `allowedTransitions` frontend'e neden backend'den geliyor?**
Cevap: Frontend'in rol mantığını bilmesine gerek yok. Backend doğru listeyi döndürür, frontend sadece butonu render eder. Rol değişirse frontend kodu değişmez.

**S10: Optimistic update neden kullandınız?**
Cevap: Status geçişi yapılınca API yanıtı beklenmeden UI hemen güncelleniyor. UX daha akıcı. API başarısız olursa cache invalidate edilip gerçek veri çekilir.

**S11: `credentials: 'include'` neden gerekli?**
Cevap: httpOnly cookie'nin cross-origin isteklere eklenmesi için. Olmasa cookie gönderilmez, her istek 401 döner.

**S12: Skeleton loading neden spinner yerine tercih edildi?**
Cevap: Skeleton, içeriğin yerleşimini önceden gösterir — layout shift olmaz. Spinner sadece "bir şeyler yükleniyor" der, nerede ne olacağını söylemez. WCAG açısından da skeleton daha az distraksiyon.

**S13: Select box yerine neden buton kullandınız?**
Cevap: Select box tüm durumları listeler — geçersiz seçenekler de görünür, kullanıcı yanlış seçim yapabilir. `allowedTransitions`'dan gelen butonlar sadece geçerli aksiyonları gösterir. UX daha net, hata olasılığı sıfır.

**S14: `next.config.ts`'teki rewrite neden var?**
Cevap: Frontend `/api/*` isteklerini backend'e proxy'liyor. Browser aynı origin görür — CORS sorunu yok, cookie otomatik gidiyor.

**S15: DSGVO'da Art. 9 neden önemli?**
Cevap: Hasta bilgileri "özel nitelikli kişisel veri" sayılır (sağlık verisi). Standart kişisel veriden daha güçlü koruma gerektirir. Şifreli saklama, erişim kontrolü, audit log zorunlu. 100.000€'ya varan ceza riski var.

---

## 4. Kodda En Etkileyici 3 Yer

### 1. `AppointmentStatus.java` — State Machine (satır 19-36)
```java
private static final Map<AppointmentStatus, Set<AppointmentStatus>> ALLOWED_TRANSITIONS = Map.of(
    PENDING,   Set.of(CONFIRMED, CANCELLED),
    CONFIRMED, Set.of(COMPLETED, CANCELLED, NO_SHOW),
    ...
);
```
**Neden etkileyici:** Tüm business logic tek bir immutable Map'te. Test edilmesi kolay, değişmesi kolay, okunması kolay. Service'te if-else olmadığı için open/closed prensibine uygun.

### 2. `AppointmentRepository.java` — Conflict Query (satır 22-38)
```java
@Query("SELECT a FROM Appointment a WHERE a.doctorName = :doctorName
  AND a.id <> :excludeId
  AND a.status NOT IN :ignoredStatuses
  AND a.appointmentTime BETWEEN :from AND :to")
```
**Neden etkileyici:** Tek query hem create hem update senaryosunu handle ediyor. `excludeId` parametresi zekice — güncelleme sırasında randevunun kendisiyle çakışmasını önlüyor.

### 3. `StatusTimeline.tsx` — Frontend State Machine Visualization
**Neden etkileyici:** Kargo takip tarzı timeline. `allowedTransitions` backend'den geliyor, frontend hiç business logic bilmiyor. Butonlar dinamik — sadece geçerli aksiyonlar görünüyor. WCAG uyumlu, dark mode destekli.

---

## 5. Frontend: Ekranlar ve UX Kararları

| Ekran | Karar | Neden |
|-------|-------|-------|
| Dashboard | KPI kartları + tablo | Admin tek bakışta bugün/bekleyen/tamamlanan görür |
| Status panel | Timeline (kargo takip) | Soyut durumlar somut adımlar haline gelir |
| Aksiyon butonları | Backend'den driven | Frontend rol mantığı bilmez |
| Hata mesajları | RFC 7807 `detail` field | Kullanıcıya anlamlı mesaj, parse etmesi kolay |
| Çakışma 409 | Detail mesajı göster | "Bu slot dolu" — kullanıcı ne yapacağını bilir |
| Skeleton loading | Her liste yüklemede | Layout shift yok, WCAG uyumlu |
| Dark/Light mode | `next-themes` | System preference + manuel toggle |
| Alman formatı | `dd.MM.yyyy HH:mm` | DACH standartı, `date-fns/locale/de` |

---

## 6. Zayıf Noktalar (Dürüst Değerlendirme)

1. **Refresh token yok.** JWT 24 saat sonra expire oluyor, kullanıcı otomatik logout. Production'da refresh token rotation eklenmeliydi.

2. **Testcontainers eksik.** Unit testler var ama integration test (gerçek PostgreSQL container) yok. `AppointmentRepository` query'leri sadece production'da test edilebilir halde.

3. **Frontend'de form validation eksik.** `react-hook-form` + `zod` kurulumu yapıldı ama formda native HTML validation kullanıldı. Zod schema ile client-side validation daha güçlü olurdu.

4. **Audit logging yok.** DSGVO Art. 9 kapsamında kimin hangi randevuya ne zaman eriştiği loglanmalı. `@EntityListeners` veya Spring AOP ile eklenebilir.

5. **Doktor listesi hardcoded.** `GERMAN_DOCTORS` array'i frontend'de sabit. Gerçek projede `GET /api/doctors` endpoint'i olmalı.

6. **Rate limiting yok.** Login endpoint brute-force'a açık. Bucket4j veya Spring Cloud Gateway ile eklenebilir.

---

## 7. Railway'de Nasıl Deploy Edilir

```bash
# 1. GitHub'a push
git add .
git commit -m "feat: production-ready clinic API"
git push origin main

# 2. Railway'de:
# → railway.app → New Project → Deploy from GitHub repo → clinic-appointment-api seç

# 3. PostgreSQL plugin ekle:
# → + New → Database → PostgreSQL
# Railway otomatik RAILWAY_DATABASE_URL set eder

# 4. Environment variables ekle (Settings → Variables):
SPRING_DATASOURCE_URL  = ${{Postgres.DATABASE_URL}}   # Railway'in sağladığı
PGUSER                 = ${{Postgres.PGUSER}}
PGPASSWORD             = ${{Postgres.PGPASSWORD}}
JWT_SECRET             = <random 64 char string>
PORT                   = 8084

# 5. Frontend için ayrı service:
# → + New → GitHub Repo → frontend/clinic-app klasörünü root olarak seç
# NEXT_PUBLIC_API_URL = https://<backend-url>.railway.app
# API_URL             = https://<backend-url>.railway.app

# 6. Her git push'ta Railway otomatik build + deploy yapar (Dockerfile kullanır)
```

**Not:** Railway ücretsiz plan ile başlanabilir. Production için Hobby plan ($5/ay) önerilir — sleep olmaz.

---

*Bu doküman Faz C kapsamında hazırlanmıştır. Mülakatta her maddeyi kendi cümlelerinle anlatabiliyorsan hazırsın.*
