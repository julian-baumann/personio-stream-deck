/// <reference path="libs/js/action.js" />
/// <reference path="libs/js/stream-deck.js" />
/// <reference path="Personio.js" />

const myAction = new Action("com.julian-baumann.personio-deck.action");
let personioSDKInstances = {};

myAction.onDidReceiveSettings(async ({ action, context, device, event, payload }) => {
    const settings = payload.settings;

    if (settings.clientId && settings.clientSecret && settings.employeeId && settings.projectId) {
        if (personioSDKInstances[context]) {
            personioSDKInstances[context].clientId = settings.clientId;
            personioSDKInstances[context].clientSecret = settings.clientSecret;
            personioSDKInstances[context].employeeId = parseInt(settings.employeeId);
            personioSDKInstances[context].projectId = parseInt(settings.projectId);
        } else {
            personioSDKInstances[context] = new PersonioSDK(
                settings.clientId,
                settings.clientSecret,
                parseInt(settings.employeeId),
                parseInt(settings.projectId),
                $SD,
                context,
                (projectId) => {
                    for (const [key, instance] of Object.entries(personioSDKInstances)) {
                        if (instance.projectId != projectId) {
                            instance.setInactiveState();
                        }
                    }
                }
            );
        }
    }
})

myAction.onWillAppear(({ action, context, device, event, payload }) => {
    $SD.getSettings(context)
})

myAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    const instance = personioSDKInstances[context];
    instance.toggleTracking();
});