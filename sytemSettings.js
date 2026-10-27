/* =====================================================
   GREEN HONEY BADGER SYSTEM
   CENTRAL SETTINGS CONNECTOR
   ===================================================== */

function getSystemSettings() {

    const schoolDetails = JSON.parse(
        localStorage.getItem("schoolDetails") || "{}"
    );

    const academicSettings = JSON.parse(
        localStorage.getItem("academicSettings") || "{}"
    );

    const administratorSettings = JSON.parse(
        localStorage.getItem("administratorSettings") || "{}"
    );

    const appearanceSettings = JSON.parse(
        localStorage.getItem("appearanceSettings") || "{}"
    );

    return {
        school: {
            name: schoolDetails.schoolName || "",
            code: schoolDetails.schoolCode || "",
            address: schoolDetails.address || "",
            subCounty: schoolDetails.subCounty || "",
            county: schoolDetails.county || "",
            phone: schoolDetails.phone || "",
            email: schoolDetails.email || ""
        },

        academic: {
            year: academicSettings.year || "2026",
            term: academicSettings.term || "1",
            exam: academicSettings.exam || "END TERM",
            schoolLevel: academicSettings.schoolLevel || "Junior School"
        },

        administrator: {
            name: administratorSettings.name || "",
            role: administratorSettings.role || ""
        },

        appearance: {
            systemName:
                appearanceSettings.systemName ||
                "GREEN HONEY BADGER SYSTEM",

            headerColor:
                appearanceSettings.headerColor ||
                "#333333",

            fontSize:
                appearanceSettings.fontSize ||
                "12px",

            theme:
                appearanceSettings.theme ||
                "light"
        }
    };
}


/* =====================================================
   QUICK ACCESS FUNCTIONS
   ===================================================== */

function getCurrentYear() {
    return getSystemSettings().academic.year;
}

function getCurrentTerm() {
    return getSystemSettings().academic.term;
}

function getCurrentExam() {
    return getSystemSettings().academic.exam;
}

function getSchoolName() {
    return getSystemSettings().school.name;
}

function getSystemName() {
    return getSystemSettings().appearance.systemName;
}


/* =====================================================
   APPLY SYSTEM APPEARANCE
   ===================================================== */

function applySystemAppearance() {

    const settings = getSystemSettings();

    document.documentElement.style.setProperty(
        "--system-header-color",
        settings.appearance.headerColor
    );

    document.documentElement.style.setProperty(
        "--system-font-size",
        settings.appearance.fontSize
    );

    document.body.style.fontSize =
        settings.appearance.fontSize;

    const headers = document.querySelectorAll(
        ".header, header, .top-header"
    );

    headers.forEach(function(header) {
        header.style.backgroundColor =
            settings.appearance.headerColor;
    });
}


/* =====================================================
   UPDATE SYSTEM NAME
   ===================================================== */

function applySystemName() {

    const settings = getSystemSettings();

    const elements = document.querySelectorAll(
        "[data-system-name]"
    );

    elements.forEach(function(element) {
        element.textContent =
            settings.appearance.systemName;
    });

    if (document.title === "" ||
        document.title === "Document") {

        document.title =
            settings.appearance.systemName;
    }
}


/* =====================================================
   INITIALISE SETTINGS
   ===================================================== */

document.addEventListener("DOMContentLoaded", function() {

    applySystemAppearance();
    applySystemName();

});