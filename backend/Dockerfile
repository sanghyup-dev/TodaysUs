# 1단계: 빌드용 이미지 (Gradle로 jar 만들기)
FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app

# Gradle wrapper & 설정 파일들 복사
COPY gradlew gradlew
COPY gradle gradle
COPY build.gradle settings.gradle ./

# 소스 코드 복사
COPY src src

# Gradle 실행 권한 부여
RUN chmod +x gradlew

# 테스트는 생략하고 bootJar 빌드
RUN ./gradlew clean bootJar -x test


# 2단계: 실제 런타임 이미지 (JRE만)
FROM eclipse-temurin:21-jre

WORKDIR /app

# 빌드 결과 jar 한 개를 app.jar로 복사
COPY --from=builder /app/build/libs/*.jar app.jar

# Render가 PORT 환경변수를 주기 때문에, 그 포트에 바인딩해야 함
# -Dserver.port=$PORT 를 꼭 넣어준다.
CMD ["sh", "-c", "java $JAVA_OPTS -Dserver.port=$PORT -jar app.jar"]
