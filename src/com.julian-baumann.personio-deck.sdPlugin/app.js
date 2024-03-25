/// <reference path="libs/js/action.js" />
/// <reference path="libs/js/stream-deck.js" />
/// <reference path="Personio.js" />

const myAction = new Action("com.julian-baumann.personio-deck.action");
let personioSDKInstances = {}

myAction.onDidReceiveSettings(async ({ action, context, device, event, payload }) => {
    const settings = payload.settings;

    personioSDKInstances[context] = new PersonioSDK(
        settings.clientId,
        settings.clientSecret,
        parseInt(settings.employeeId),
        parseInt(settings.projectId),
        $SD,
        context
    );
})

myAction.onWillAppear(({ action, context, device, event, payload }) => {
    $SD.getSettings(context)
})

myAction.onKeyUp(async ({ action, context, device, event, payload }) => {
    const instance = personioSDKInstances[context];
    instance.toggleTracking();
});