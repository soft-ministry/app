package ro.church_office.modern.auth.service;

import java.util.List;

import ro.church_office.modern.auth.dto.LoginRequest;
import ro.church_office.modern.auth.dto.LoginResponse;
import ro.church_office.modern.security.jwt.JwtService;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        List<String> roles = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(authority -> authority.startsWith("ROLE_") ? authority.substring(5) : authority)
                .toList();
        String token = jwtService.createToken(authentication.getName(), roles);
        return new LoginResponse(token, "Bearer", jwtService.expirationSeconds(), authentication.getName(), roles);
    }
}
