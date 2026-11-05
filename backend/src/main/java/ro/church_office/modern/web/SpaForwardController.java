package ro.church_office.modern.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {

    @GetMapping({"/dashboard", "/persons", "/families", "/groups", "/events", "/calendar", "/attendance",
            "/finance", "/reports", "/social-support", "/settings", "/users", "/login"})
    public String forwardSpaRoutes() {
        return "forward:/index.html";
    }
}
