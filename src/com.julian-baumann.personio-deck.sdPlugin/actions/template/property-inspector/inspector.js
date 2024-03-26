/// <reference path="../../../libs/js/property-inspector.js" />
/// <reference path="../../../libs/js/utils.js" />
/// <reference path="../../../Constants.js" />

let projectsLoaded = false;

$PI.onConnected((jsonData) => {
    const form = document.querySelector("#property-inspector");
    const { actionInfo, appInfo, connection, messageType, port, uuid } = jsonData;
    const { payload, context } = actionInfo;
    const { settings } = payload;

    Utils.setFormValue(settings, form);

    if (settings.clientId && settings.clientSecret && settings.employeeId) {
        setProjects(settings);
    }

    form.addEventListener(
        "input",
        Utils.debounce(500, () => {
            const value = Utils.getFormValue(form);
            $PI.setSettings(value);

            if (value.clientId && value.clientSecret && value.employeeId) {
                setProjects(value);
            }
        })
    );
});

$PI.onDidReceiveGlobalSettings(({payload}) => {
    console.log("onDidReceiveGlobalSettings", payload);
})

async function getProjects(token) {
    const options = {
        method: "GET",
        headers: {
            accept: "application/json",
            authorization: `Bearer ${token}`
        }
    };

    const projects = [];

    try {
        const response = await fetch("https://api.personio.de/v1/company/attendances/projects", options);
        const data = await response.json();

        for (const project of data.data) {
            projects.push({
                id: project.id,
                name: project.attributes.name
            });
        }

        return projects;

    } catch (error) {
        console.error(error)
    }

    return null;
}

async function setProjects(settings) {
    if (projectsLoaded) {
        return;
    }

    const response = await getPersonioTokenWithCredentials(settings.clientId, settings.clientSecret);
    const projects = await getProjects(response.token);

    if (projects) {
        const selectElement = document.getElementById("projectSelection");

        for (const project of projects) {
            const option = document.createElement("option");
            option.value = project.id;
            option.innerHTML = project.name;

            if (settings.projectId == project.id) {
                option.selected = true;
            }

            selectElement.appendChild(option);
        }
    }

    projectsLoaded = true;
}
