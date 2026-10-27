/* =========================================================
   GREEN HONEY BADGER SYSTEM
   CENTRAL SCHOOL DATA BACKUP / RECOVERY ENGINE
   Version 1.6
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       BACKUP VERSION
    ===================================================== */

    const GBH_BACKUP_VERSION = "1.6";


    /* =====================================================
       AUTOMATIC RECOVERY SNAPSHOT KEY
    ===================================================== */

    const GBH_AUTO_RECOVERY_KEY =
        "gbhAutomaticRecoverySnapshot";


    /* =====================================================
       APPROVED GBH SCHOOL DATA

       LICENSING DATA IS NOT INCLUDED.
       LIBRARY DATA IS NOT INCLUDED.
    ===================================================== */

    const GBH_BACKUP_KEYS = [

        "schoolDetails",

        "students",

        "examResults",

        "fees",

        "teachers",

        "systemUsers",

        "academicSettings",

        "administratorSettings",

        "appearanceSettings"

    ];


    /* =====================================================
       CENTRAL RECOVERY CONTROL
    ===================================================== */

    let GBH_RECOVERY_RUNNING = false;

    let GBH_AUTO_RECOVERY_ENABLED = true;


    /* =====================================================
       EXTERNAL RECOVERY FILE
    ===================================================== */

    const GBH_EXTERNAL_RECOVERY_FILE =
        "GBH_RECOVERY_SNAPSHOT.json";


    /* =====================================================
       SAVE ORIGINAL LOCAL STORAGE FUNCTION
    ===================================================== */

    const GBH_ORIGINAL_LOCAL_STORAGE_SET_ITEM =
        Storage.prototype.setItem;


    /* =====================================================
       READ ONE LOCAL STORAGE VALUE
    ===================================================== */

    function readGBHBackupValue(key) {

        const value =
            localStorage.getItem(key);


        if (value === null) {

            return null;

        }


        try {

            return JSON.parse(value);

        }

        catch (error) {

            throw new Error(
                "Backup stopped because the stored data for '" +
                key +
                "' is not valid JSON."
            );

        }

    }


    /* =====================================================
       COLLECT APPROVED GBH DATA
    ===================================================== */

    function collectGBHBackupData() {

        const backupData = {};


        GBH_BACKUP_KEYS.forEach(function (key) {

            backupData[key] =
                readGBHBackupValue(key);

        });


        return backupData;

    }


    /* =====================================================
       CREATE BACKUP PACKAGE
    ===================================================== */

    function createGBHBackupPackage() {

        return {

            system:
                "GREEN HONEY BADGER SYSTEM",

            backupVersion:
                GBH_BACKUP_VERSION,

            backupDate:
                new Date().toISOString(),

            data:
                collectGBHBackupData()

        };

    }


    /* =====================================================
       CREATE AUTOMATIC RECOVERY SNAPSHOT
    ===================================================== */

    function createGBHAutoRecoverySnapshot() {

        if (GBH_RECOVERY_RUNNING) {

            return {

                success: false,

                snapshotDate:
                    null,

                message:
                    "Automatic recovery is already running."

            };

        }


        GBH_RECOVERY_RUNNING = true;


        try {

            const recoveryPackage =
                createGBHBackupPackage();


            GBH_ORIGINAL_LOCAL_STORAGE_SET_ITEM.call(

                localStorage,

                GBH_AUTO_RECOVERY_KEY,

                JSON.stringify(
                    recoveryPackage
                )

            );


            return {

                success: true,

                snapshotDate:
                    recoveryPackage.backupDate,

                message:
                    "Automatic recovery snapshot created successfully."

            };

        }


        catch (error) {

            console.error(
                "GREEN HONEY BADGER AUTOMATIC RECOVERY ERROR:",
                error
            );


            return {

                success: false,

                snapshotDate:
                    null,

                message:
                    error.message

            };

        }


        finally {

            GBH_RECOVERY_RUNNING = false;

        }

    }


    /* =====================================================
       CENTRAL SAVE OBSERVER
    ===================================================== */

    function installGBHAutomaticRecoveryHook() {

        Storage.prototype.setItem =
            function (key, value) {

                GBH_ORIGINAL_LOCAL_STORAGE_SET_ITEM.call(

                    this,

                    key,

                    value

                );


                if (
                    GBH_RECOVERY_RUNNING ||
                    !GBH_AUTO_RECOVERY_ENABLED ||
                    this !== localStorage
                ) {

                    return;

                }


                createGBHAutoRecoverySnapshot();

            };


        console.info(
            "GREEN HONEY BADGER: Central automatic recovery hook installed."
        );

    }


    /* =====================================================
       GET AUTOMATIC RECOVERY SNAPSHOT
    ===================================================== */

    function getGBHAutoRecoverySnapshot() {

        const recoveryText =
            localStorage.getItem(
                GBH_AUTO_RECOVERY_KEY
            );


        if (recoveryText === null) {

            return null;

        }


        try {

            return JSON.parse(
                recoveryText
            );

        }

        catch (error) {

            console.error(
                "GREEN HONEY BADGER RECOVERY READ ERROR:",
                error
            );


            return null;

        }

    }


    /* =====================================================
       CHECK WHETHER RECOVERY SNAPSHOT EXISTS
    ===================================================== */

    function hasGBHAutoRecoverySnapshot() {

        return (
            localStorage.getItem(
                GBH_AUTO_RECOVERY_KEY
            ) !== null
        );

    }


    /* =====================================================
       MANUALLY CREATE RECOVERY SNAPSHOT
    ===================================================== */

    function runGBHRecoveryNow() {

        return createGBHAutoRecoverySnapshot();

    }


    /* =====================================================
       ENABLE AUTOMATIC RECOVERY
    ===================================================== */

    function enableGBHAutoRecovery() {

        GBH_AUTO_RECOVERY_ENABLED = true;

    }


    /* =====================================================
       DISABLE AUTOMATIC RECOVERY
    ===================================================== */

    function disableGBHAutoRecovery() {

        GBH_AUTO_RECOVERY_ENABLED = false;

    }


    /* =====================================================
       CHECK AUTOMATIC RECOVERY STATUS
    ===================================================== */

    function isGBHAutoRecoveryEnabled() {

        return GBH_AUTO_RECOVERY_ENABLED;

    }


    /* =====================================================
       CHOOSE FOLDER AND SAVE RECOVERY COPY
    ===================================================== */

    async function chooseAndSaveGBHRecoveryFolder() {

        if (
            typeof window.showDirectoryPicker !==
            "function"
        ) {

            return {

                success: false,

                fileName:
                    null,

                message:
                    "This browser does not support direct recovery-folder access."

            };

        }


        try {

            const folderHandle =
                await window.showDirectoryPicker({

                    mode: "readwrite"

                });


            const recoveryPackage =
                createGBHBackupPackage();


            const recoveryText =
                JSON.stringify(
                    recoveryPackage,
                    null,
                    2
                );


            const recoveryFile =
                await folderHandle.getFileHandle(

                    GBH_EXTERNAL_RECOVERY_FILE,

                    {

                        create: true

                    }

                );


            const writable =
                await recoveryFile.createWritable();


            await writable.write(
                recoveryText
            );


            await writable.close();


            console.info(
                "GREEN HONEY BADGER: External recovery copy created successfully."
            );


            return {

                success: true,

                fileName:
                    GBH_EXTERNAL_RECOVERY_FILE,

                folderName:
                    folderHandle.name,

                snapshotDate:
                    recoveryPackage.backupDate,

                message:
                    "GREEN HONEY BADGER external recovery copy created successfully."

            };

        }


        catch (error) {

            console.error(
                "GREEN HONEY BADGER EXTERNAL RECOVERY ERROR:",
                error
            );


            return {

                success: false,

                fileName:
                    null,

                message:
                    error.message

            };

        }

    }


    /* =====================================================
       RESTORE DATA FROM EXTERNAL RECOVERY FILE
       
       ONLY APPROVED GBH SCHOOL DATA IS RESTORED.

       LIBRARY DATA IS NOT RESTORED.
       LICENSING DATA IS NOT RESTORED.
    ===================================================== */

    async function restoreGBHFromExternalRecovery() {

        if (
            typeof window.showOpenFilePicker !==
            "function"
        ) {

            return {

                success: false,

                message:
                    "This browser does not support recovery-file access."

            };

        }


        if (GBH_RECOVERY_RUNNING) {

            return {

                success: false,

                message:
                    "A recovery operation is already running."

            };

        }


        try {

            /* =============================================
               STEP 1 — SELECT RECOVERY FILE
            ============================================== */

            const selectedFiles =
                await window.showOpenFilePicker({

                    multiple: false,

                    types: [

                        {

                            description:
                                "GREEN HONEY BADGER Recovery File",

                            accept: {

                                "application/json":
                                    [".json"]

                            }

                        }

                    ]

                });


            if (
                !selectedFiles ||
                selectedFiles.length === 0
            ) {

                return {

                    success: false,

                    message:
                        "No recovery file was selected."

                };

            }


            const fileHandle =
                selectedFiles[0];


            /* =============================================
               STEP 2 — READ FILE
            ============================================== */

            const file =
                await fileHandle.getFile();


            const recoveryText =
                await file.text();


            let recoveryPackage;


            try {

                recoveryPackage =
                    JSON.parse(
                        recoveryText
                    );

            }

            catch (error) {

                return {

                    success: false,

                    message:
                        "The selected recovery file is not valid JSON."

                };

            }


            /* =============================================
               STEP 3 — VERIFY RECOVERY PACKAGE
            ============================================== */

            if (
                !recoveryPackage ||
                typeof recoveryPackage !==
                "object"
            ) {

                return {

                    success: false,

                    message:
                        "The recovery file is not a valid GREEN HONEY BADGER recovery package."

                };

            }


            if (
                recoveryPackage.system !==
                "GREEN HONEY BADGER SYSTEM"
            ) {

                return {

                    success: false,

                    message:
                        "This file is not a GREEN HONEY BADGER recovery file."

                };

            }


            if (
                !recoveryPackage.data ||
                typeof recoveryPackage.data !==
                "object"
            ) {

                return {

                    success: false,

                    message:
                        "The recovery file does not contain valid school data."

                };

            }


            /* =============================================
               STEP 4 — CONFIRM RESTORATION
            ============================================== */

            const confirmed =
                window.confirm(

                    "GREEN HONEY BADGER SYSTEM\n\n" +

                    "You are about to restore school data " +
                    "from the selected recovery file.\n\n" +

                    "Current approved school data will be replaced " +
                    "with the data contained in the recovery file.\n\n" +

                    "Do you want to continue?"

                );


            if (!confirmed) {

                return {

                    success: false,

                    message:
                        "Recovery cancelled by administrator."

                };

            }


            /* =============================================
               STEP 5 — START RESTORATION
            ============================================== */

            GBH_RECOVERY_RUNNING = true;


            let restoredCount = 0;


            try {

                GBH_BACKUP_KEYS.forEach(
                    function (key) {

                        if (
                            Object.prototype.hasOwnProperty.call(
                                recoveryPackage.data,
                                key
                            )
                        ) {

                            const value =
                                recoveryPackage.data[key];


                            GBH_ORIGINAL_LOCAL_STORAGE_SET_ITEM.call(

                                localStorage,

                                key,

                                JSON.stringify(
                                    value
                                )

                            );


                            restoredCount++;

                        }

                    }
                );


                /* =========================================
                   CREATE FRESH INTERNAL SNAPSHOT
                ========================================== */

                const restoredPackage =
                    createGBHBackupPackage();


                GBH_ORIGINAL_LOCAL_STORAGE_SET_ITEM.call(

                    localStorage,

                    GBH_AUTO_RECOVERY_KEY,

                    JSON.stringify(
                        restoredPackage
                    )

                );


                return {

                    success: true,

                    restoredCount:
                        restoredCount,

                    backupDate:
                        recoveryPackage.backupDate,

                    message:
                        "GREEN HONEY BADGER school data restored successfully."

                };

            }


            finally {

                GBH_RECOVERY_RUNNING = false;

            }

        }


        catch (error) {

            console.error(
                "GREEN HONEY BADGER RESTORE ERROR:",
                error
            );


            GBH_RECOVERY_RUNNING = false;


            return {

                success: false,

                message:
                    error.message

            };

        }

    }


    /* =====================================================
       DOWNLOAD MANUAL BACKUP FILE
    ===================================================== */

    function downloadGBHBackup() {

        try {

            const backupPackage =
                createGBHBackupPackage();


            const backupText =
                JSON.stringify(
                    backupPackage,
                    null,
                    2
                );


            const backupBlob =
                new Blob(
                    [backupText],
                    {

                        type:
                            "application/json"

                    }
                );


            const downloadURL =
                URL.createObjectURL(
                    backupBlob
                );


            const currentDate =
                new Date()
                    .toISOString()
                    .slice(0, 10);


            const fileName =
                "GREEN_HONEY_BADGER_BACKUP_" +
                currentDate +
                ".gbhbackup";


            const downloadLink =
                document.createElement("a");


            downloadLink.href =
                downloadURL;


            downloadLink.download =
                fileName;


            document.body.appendChild(
                downloadLink
            );


            downloadLink.click();


            document.body.removeChild(
                downloadLink
            );


            setTimeout(

                function () {

                    URL.revokeObjectURL(
                        downloadURL
                    );

                },

                1000

            );


            return {

                success: true,

                fileName:
                    fileName,

                message:
                    "GREEN HONEY BADGER backup created successfully."

            };

        }


        catch (error) {

            console.error(
                "GREEN HONEY BADGER BACKUP ERROR:",
                error
            );


            return {

                success: false,

                fileName:
                    null,

                message:
                    error.message

            };

        }

    }


    /* =====================================================
       PUBLIC GBH BACKUP API
    ===================================================== */

    window.GBHBackup = {

        version:
            GBH_BACKUP_VERSION,

        keys:
            GBH_BACKUP_KEYS.slice(),

        recoveryKey:
            GBH_AUTO_RECOVERY_KEY,

        externalRecoveryFile:
            GBH_EXTERNAL_RECOVERY_FILE,

        collect:
            collectGBHBackupData,

        create:
            createGBHBackupPackage,

        autoRecovery:
            createGBHAutoRecoverySnapshot,

        runRecoveryNow:
            runGBHRecoveryNow,

        getRecovery:
            getGBHAutoRecoverySnapshot,

        hasRecovery:
            hasGBHAutoRecoverySnapshot,

        enableAutoRecovery:
            enableGBHAutoRecovery,

        disableAutoRecovery:
            disableGBHAutoRecovery,

        isAutoRecoveryEnabled:
            isGBHAutoRecoveryEnabled,

        chooseAndSaveRecoveryFolder:
            chooseAndSaveGBHRecoveryFolder,

        restoreFromExternalRecovery:
            restoreGBHFromExternalRecovery,

        download:
            downloadGBHBackup

    };


    /* =====================================================
       INSTALL CENTRAL RECOVERY CONNECTION
    ===================================================== */

    installGBHAutomaticRecoveryHook();


})();