// Redirect to login if not authenticated
(function() {
    const token = localStorage.getItem("lumos_token");
    if (!token) {
        window.location.href = "/lumos-connect/front-end/pages/login/login.html";
    }
})();
