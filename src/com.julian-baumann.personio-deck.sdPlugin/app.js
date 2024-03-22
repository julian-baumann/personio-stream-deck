/// <reference path="libs/js/action.js" />
/// <reference path="libs/js/stream-deck.js" />

const myAction = new Action("com.julian-baumann.personio-deck.action");
let projectId;
let employeeId;
let token;
let currentAttendance = null
let currentAttendanceId = null

async function getPersonioToken(clientId, clientSecret) {
    const request = await fetch("https://api.personio.de/v1/auth", {
            method: "POST",
            body: JSON.stringify({
                    "client_id": clientId,
                    "client_secret": clientSecret
            })
    });

    const response = await request.json();

    return { token: response.data["token"], expiresIn: response.data["expires_in"]};
}

async function getOpenAttendace() {
    const options = {
            method: "GET",
            headers: {
                accept: "application/json",
                authorization: `Bearer ${token}`
            }
    };

    let currentDate = new Date().toISOString().split("T")[0]

    const request = await fetch(`https://api.personio.de/v1/company/attendances?start_date=${currentDate}&end_date=${currentDate}&employees[]=${employeeId}&limit=200&offset=0`, options);
    const response = await request.json();
    console.log(response)

    for (const attendance of response.data) {
        if (attendance.attributes.employee == employeeId && attendance.attributes.end_time == null) {
            return { attendanceId: attendance.id, projectId: attendance.attributes.project?.id }
        }
    }
}

async function startTracking() {
    let currentDate = new Date().toISOString().split("T")[0]
    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    currentAttendance = {
        employee: employeeId,
        date: currentDate,
        start_time: currentTime,
        project_id: projectId,
        break: 0
    };

    const options = {
        method: "POST",
        headers: {
            accept: "application/json",
            "content-type": "application/json",
            authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            attendances: [
                currentAttendance
            ]
        })
    };

    try {
        const request = await fetch("https://api.personio.de/v1/company/attendances", options);
        const response = await request.json()
        console.log(response);
        currentAttendanceId = response?.data?.id[0];

        console.log(currentAttendanceId);
    } catch (error) {
        console.error(error);
    }
}

async function stopTracking(attendanceId) {
    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const options = {
        method: "PATCH",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({end_time: currentTime})
      };

      fetch(`https://api.personio.de/v1/company/attendances/${attendanceId}`, options)
        .then(response => response.json())
        .then(response => console.log(response))
        .catch(err => console.error(err));
}

/**
 * The first event fired when Stream Deck starts
 */
$SD.onConnected(({ actionInfo, appInfo, connection, messageType, port, uuid }) => {
    console.log("Stream Deck connected!");
});

myAction.onDidReceiveSettings(async ({ action, context, device, event, payload }) => {
    console.log("Received settings", payload.settings);

    const settings = payload.settings;

    if (settings.clientId && settings.clientSecret && settings.projectId && settings.employeeId) {
            token = (await getPersonioToken(settings.clientId, settings.clientSecret)).token;
            employeeId = parseInt(settings.employeeId);
            projectId = parseInt(settings.projectId);

            console.log(token);

            console.log("current attendance:", await getOpenAttendace());
    }
})

myAction.onWillAppear(({ action, context, device, event, payload }) => {
    $SD.getSettings(context)
})

myAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    const openAttendance = await getOpenAttendace();

    if (openAttendance) {
        console.log("Stop tracking!");
        await stopTracking(openAttendance.attendanceId);

        console.log(openAttendance.projectId, projectId)

        if (openAttendance.projectId != projectId) {
            console.log("Starting tracking!");
            await startTracking();
        }
    } else {
        console.log("Start tracking!");
        await startTracking();
    }
});

myAction.onDialRotate(({ action, context, device, event, payload }) => {
    console.log("Your dial code goes here!");
});
