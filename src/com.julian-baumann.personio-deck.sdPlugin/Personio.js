/// <reference path="Constants.js" />

class PersonioSDK {
    clientId;
    clientSecret;
    employeeId;
    comment;
    projectId;
    token;
    tokenExpirationDate;
    currentAttendance;
    currentAttendanceId;
    currentState = 0;
    streamDeckSDK;
    titleUpdateInterval;
    startedDateTime;
    context;
    projectChangeCallback;
    disableAutoCheck = false;

    constructor(clientId, clientSecret, employeeId, projectId, comment, streamDeckSDK, context, projectChangeCallback) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.employeeId = employeeId;
        this.projectId = projectId;
        this.comment = comment;
        this.streamDeckSDK = streamDeckSDK;
        this.context = context;
        this.projectChangeCallback = projectChangeCallback;

        this.checkStatus()
            .then()
            .catch((error) => console.error(error));

        setInterval(() => {
            this.checkStatus()
            .then()
            .catch((error) => console.error(error));
        }, 5000);
    }

    async getPersonioToken() {
        const currentSeconds = new Date().getTime() / 1000;

        if (this.token != null && this.tokenExpirationDate > currentSeconds) {
            return this.token;
        }

        const response = await getPersonioTokenWithCredentials(this.clientId, this.clientSecret);
        this.token = response.token;
        this.tokenExpirationDate = currentSeconds + response.expiresIn;

        return this.token;
    }

    async getOpenAttendace() {
        const options = {
            method: "GET",
            headers: {
                accept: "application/json",
                authorization: `Bearer ${await this.getPersonioToken()}`
            }
        };

        let currentDate = new Date().toISOString().split("T")[0]

        const request = await fetch(`https://api.personio.de/v1/company/attendances?start_date=${currentDate}&end_date=${currentDate}&employees[]=${this.employeeId}&limit=50&offset=0`, options);
        const response = await request.json();

        for (const attendance of response.data) {
            if (attendance.attributes.employee == this.employeeId && attendance.attributes.end_time == null) {
                return {
                    attendanceId: attendance.id,
                    projectId: attendance.attributes.project?.id,
                    startDateTime: `${attendance.attributes.date}T${attendance.attributes.start_time}`,
                    startTime: attendance.attributes.start_time,
                    date: attendance.attributes.date
                }
            }
        }
    }

    getTime() {
        const targetDate = new Date(this.currentDateTime);
        const now = new Date();

        let difference = now - targetDate;

        // Convert milliseconds to seconds
        difference = Math.floor(difference / 1000);

        // Calculate hours and remaining seconds
        const hours = Math.floor(difference / 3600);
        difference %= 3600;

        // Calculate minutes
        const minutes = Math.floor(difference / 60);

        // Calculate remaining seconds
        const seconds = difference % 60;

        // Format the result
        const formattedResult = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

        return formattedResult;
    }

    async checkStatus() {
        if (this.disableAutoCheck) {
            return;
        }

        const openAttendance = await this.getOpenAttendace();

        if (openAttendance && (openAttendance?.projectId == this.projectId || openAttendance?.attendanceId == this.currentAttendanceId)) {
            this.currentDateTime = openAttendance.startDateTime;

            if (this.titleUpdateInterval == null && !this.disableAutoCheck) {
                this.setActiveState();
            }

            return;
        }

        if (!this.disableAutoCheck) {
            this.setInactiveState();
        }
    }

    setActiveState() {
        this.streamDeckSDK.setState(this.context, 1);
        this.streamDeckSDK.setTitle(this.context, this.getTime());
        this.projectChangeCallback(this.projectId, this.currentAttendanceId);

        if (this.titleUpdateInterval == null) {
            this.titleUpdateInterval = setInterval(() => {
                this.streamDeckSDK.setTitle(this.context, this.getTime());
            }, 1000);
        }
    }

    setInactiveState() {
        if (this.titleUpdateInterval != null) {
            clearInterval(this.titleUpdateInterval);
            this.titleUpdateInterval = null;
        }

        this.streamDeckSDK.clearTitle(this.context);
        this.streamDeckSDK.setState(this.context, 0);
    }

    async startTracking() {
        this.streamDeckSDK.setState(this.context, 1);
        this.streamDeckSDK.setTitle(this.context, "Starting");

        const currentDate = new Date().toISOString().split("T")[0]
        const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        this.currentDateTime = `${currentDate}T${currentTime}`;

        this.currentAttendance = {
            employee: this.employeeId,
            date: currentDate,
            project_id: this.projectId,
            start_time: currentTime,
            comment: this.comment,
            break: 0
        };

        const options = {
            method: "POST",
            headers: {
                accept: "application/json",
                "content-type": "application/json",
                authorization: `Bearer ${await this.getPersonioToken()}`
            },
            body: JSON.stringify({
                attendances: [
                    this.currentAttendance
                ]
            })
        };

        try {
            const request = await fetch("https://api.personio.de/v1/company/attendances", options);
            const response = await request.json()
            this.currentAttendanceId = response?.data?.id[0];

            this.setActiveState();

            console.log(response);
        } catch (error) {
            console.error(error);
        }
    }

    async deleteTracking(attendanceId, skipStateChange) {
        if (!skipStateChange) {
            this.setInactiveState();
        }

        const options = {
            method: "DELETE",
            headers: {
                accept: "application/json",
                "content-type": "application/json",
                authorization: `Bearer ${await this.getPersonioToken()}`
            }
        };

        try {
            await fetch(`https://api.personio.de/v1/company/attendances/${attendanceId}`, options);
        } catch(error) {
            console.error(error);
        }
    }

    async stopTracking(attendanceId, skipStateChange) {
        const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const options = {
            method: "PATCH",
            headers: {
                accept: "application/json",
                "content-type": "application/json",
                authorization: `Bearer ${await this.getPersonioToken()}`
            },
            body: JSON.stringify({end_time: currentTime})
        };

        try {
            await fetch(`https://api.personio.de/v1/company/attendances/${attendanceId}`, options);
            this.setInactiveState();
        } catch(error) {
            console.error(error);
        }
    }

    async deleteOrStopTracking(openAttendance, skipStateChange) {
        const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        if (openAttendance.startTime == currentTime) {
            await this.deleteTracking(openAttendance.attendanceId, skipStateChange);
        } else {
            await this.stopTracking(openAttendance.attendanceId, skipStateChange);
        }
    }

    async toggleTracking() {
        this.disableAutoCheck = true;
        if (this.titleUpdateInterval != null) {
            clearInterval(this.titleUpdateInterval);
            this.titleUpdateInterval = null;
        }

        this.streamDeckSDK.setState(this.context, 1);
        this.streamDeckSDK.setTitle(this.context, "Changing");

        const openAttendance = await this.getOpenAttendace();

        if (openAttendance) {
            if (openAttendance.projectId != this.projectId) {
                await this.deleteOrStopTracking(openAttendance, true);
                await this.startTracking();
            } else {
                await this.deleteOrStopTracking(openAttendance);
            }
        } else {
            await this.startTracking();
        }

        this.disableAutoCheck = false;
    }
}