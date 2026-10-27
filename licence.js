// =====================================================
// GREEN HONEY BADGER
// LOCAL LICENCE ENGINE
// =====================================================

// Generate a simple installation ID
function generateInstallationID() {

    const existingID =
        localStorage.getItem("greenHoneyBadgerInstallationID");

    if (existingID) {
        return existingID;
    }

    const randomPart =
        Math.random()
            .toString(36)
            .substring(2, 10)
            .toUpperCase();

    const installationID =
        "GB-INS-" + randomPart;

    localStorage.setItem(
        "greenHoneyBadgerInstallationID",
        installationID
    );

    return installationID;
}


// Save activation information
function saveLicenceActivation(data) {

    const installationID =
        generateInstallationID();

    const activationData = {

        schoolName: data.schoolName,

        schoolCode: data.schoolCode,

        licenceKey: data.licenceKey,

        installationID: installationID,

        activationDate:
            new Date().toISOString(),

        status: "ACTIVE",

        licenceType: "Remote/Desktop",

        expiryDate:
            data.expiryDate || ""

    };

    localStorage.setItem(
        "greenHoneyBadgerLicence",
        JSON.stringify(activationData)
    );

    return activationData;
}


// Get saved licence information
function getLicenceActivation() {

    const saved =
        localStorage.getItem(
            "greenHoneyBadgerLicence"
        );

    if (!saved) {
        return null;
    }

    try {

        return JSON.parse(saved);

    } catch (error) {

        console.error(
            "Licence data could not be read.",
            error
        );

        return null;
    }
}


// Check whether the system has been activated
function isSystemActivated() {

    const licence =
        getLicenceActivation();

    if (!licence) {
        return false;
    }

    if (licence.status !== "ACTIVE") {
        return false;
    }

    return true;
}


// Check licence expiry
function isLicenceExpired() {

    const licence =
        getLicenceActivation();

    if (!licence) {
        return true;
    }

    if (!licence.expiryDate) {
        return false;
    }

    const today =
        new Date();

    const expiry =
        new Date(licence.expiryDate);

    return today > expiry;
}


// Get licence status
function getLicenceStatus() {

    const licence =
        getLicenceActivation();

    if (!licence) {
        return "NOT ACTIVATED";
    }

    if (licence.status !== "ACTIVE") {
        return "INACTIVE";
    }

    if (isLicenceExpired()) {
        return "EXPIRED";
    }

    return "ACTIVE";
}


// Remove local activation
// This is for development/testing only.
// We will later restrict this function.
function clearLocalLicence() {

    localStorage.removeItem(
        "greenHoneyBadgerLicence"
    );

    localStorage.removeItem(
        "greenHoneyBadgerInstallationID"
    );

    console.log(
        "Local GREEN HONEY BADGER licence cleared."
    );
}