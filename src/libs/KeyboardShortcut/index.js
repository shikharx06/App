import _ from 'underscore';
import lodashGet from 'lodash/get';
import Str from 'expensify-common/lib/str';
import getOperatingSystem from '../getOperatingSystem';
import CONST from '../../CONST';

const eventHandlers = {};
const keyboardShortcutMap = {};

/**
 * @returns {Array}
 */
function getDocumentedShortcuts() {
    return _.values(documentedShortcuts);
}

/**
 * Gets modifiers from a keyboard event.
 *
 * @param {Event} event
 * @returns {Array<String>}
 */
function getKeyEventModifiers(event) {
    const modifiers = [];
    if (event.shiftKey) {
        modifiers.push('SHIFT');
    }
    if (event.ctrlKey) {
        modifiers.push('CONTROL');
    }
    if (event.altKey) {
        modifiers.push('ALT');
    }
    if (event.metaKey) {
        modifiers.push('META');
    }
    return modifiers;
}

/**
 * Generates the normalized display name for keyboard shortcuts.
 *
 * @param {String} key
 * @param {String|Array<String>} modifiers
 * @returns {String}
 */
function getDisplayName(key, modifiers) {
    let displayName = [key.toUpperCase()];
    if (_.isString(modifiers)) {
        displayName.unshift(modifiers);
    } else if (_.isArray(modifiers)) {
        displayName = [..._.sortBy(modifiers), ...displayName];
    }

    displayName = _.map(displayName, modifier => lodashGet(CONST.KEYBOARD_SHORTCUT_KEY_DISPLAY_NAME, modifier.toUpperCase(), modifier));

    return displayName.join(' + ');
}

/**
 * Gets modifiers from a keyboard event.
 *
 * @param {Event} event
 * @returns {Array}
 */
function getKeyEventModifiers(event) {
    const modifiers = [];
    if (event.shiftKey) {
        modifiers.push('SHIFT');
    }
    if (event.ctrlKey) {
        modifiers.push('CONTROL');
    }
    if (event.altKey) {
        modifiers.push('ALT');
    }
    if (event.metaKey) {
        modifiers.push('META');
    }
    return modifiers;
}

/**
 * Generates the normalized display name for keyboard shortcuts.
 *
 * @param {String} key
 * @param {String|Array<String>} modifiers
 * @returns {String}
 */
function getDisplayName(key, modifiers) {
    let displayName = [key.toUpperCase()];
    if (_.isString(modifiers)) {
        displayName.unshift(modifiers);
    } else if (_.isArray(modifiers)) {
        displayName = [..._.sortBy(modifiers), ...displayName];
    }

    displayName = _.map(displayName, modifier => lodashGet(CONST.KEYBOARD_SHORTCUT_KEY_DISPLAY_NAME, modifier.toUpperCase(), modifier));

    return displayName.join(' + ');
}


/**
 * Checks if an event for that key is configured and if so, runs it.
 * @param {Event} event
 * @private
 */
function bindHandlerToKeydownEvent(event) {
    const eventModifiers = getKeyEventModifiers(event);
    const displayName = getDisplayName(event.key.toUpperCase(), eventModifiers);

    if (eventHandlers[displayName] === undefined) {
        return;
    }

    _.every(eventHandlers[displayName], (callback) => {
        // If configured to do so, prevent input text control to trigger this event
        if (!callback.captureOnInputs && (
            event.target.nodeName === 'INPUT'
            || event.target.nodeName === 'TEXTAREA'
            || event.target.contentEditable === 'true'
        )) {
            return true;
        }

        if (_.isFunction(callback.callback)) {
            callback.callback(event);
        }
        if (callback.shouldPreventDefault) {
            event.preventDefault();
        }

        // If the event should not bubble, short-circuit the loop
        let shouldBubble = callback.shouldBubble || false;
        if (_.isFunction(callback.shouldBubble)) {
            shouldBubble = callback.shouldBubble();
        }
        return shouldBubble;
    });
}

// Make sure we don't add multiple listeners
document.removeEventListener('keydown', bindHandlerToKeydownEvent, {capture: true});
document.addEventListener('keydown', bindHandlerToKeydownEvent, {capture: true});

/**
 * Unsubscribes a keyboard event handler.
 *
 * @param {String} displayName The display name for the key combo to stop watching
 * @param {String} callbackID The specific ID given to the callback at the time it was added
 * @private
 */
function unsubscribe(displayName, callbackID) {
    eventHandlers[displayName] = _.reject(eventHandlers[displayName], callback => callback.id === callbackID);
}

/**
 * Add key to the shortcut map
 *
 * @param {String} displayName The display name for the key combo to stop watching
 * @param {String} callbackID The specific ID given to the callback at the time it was added
 * @private
 */
function addKeyToMap(key, modifiers, descriptionKey) {
    const displayName = getDisplayName(key, modifiers);
    keyboardShortcutMap[displayName] = {
        shortcutKey: key,
        descriptionKey,
        displayName,
        modifiers,
    };
}

/**
 * Subscribes to a keyboard event.
 * @param {String} key The key to watch, i.e. 'K' or 'Escape'
 * @param {Function} callback The callback to call
 * @param {String} descriptionKey Translation key for shortcut description
 * @param {Array<String>} [modifiers] Can either be shift or control
 * @param {Boolean} [captureOnInputs] Should we capture the event on inputs too?
 * @param {Boolean|Function} [shouldBubble] Should the event bubble?
 * @param {Number} [priority] The position the callback should take in the stack. 0 means top priority, and 1 means less priority than the most recently added.
 * @param {Boolean} [shouldPreventDefault] Should call event.preventDefault after callback?
 * @returns {Function} clean up method
 */
function subscribe(key, callback, descriptionKey, modifiers = 'shift', captureOnInputs = false, shouldBubble = false, priority = 0) {
    const displayName = getDisplayName(key, modifiers);
    if (!_.has(eventHandlers, displayName)) {
        eventHandlers[displayName] = [];
    }

    const callbackID = Str.guid();
    eventHandlers[displayName].splice(priority, 0, {
        id: callbackID,
        callback,
        captureOnInputs,
        shouldBubble,
    });

    if (descriptionKey) {
        documentedShortcuts[displayName] = {
            shortcutKey: key,
            descriptionKey,
            displayName,
            modifiers,
        };
    }
    return () => unsubscribe(displayName, callbackID);
}

/**
 * Return platform specific modifiers for keys like Control (Cmd)
 * @param {Array} modifiers
 * @returns {Array}
 */
function getShortcutModifiers(modifiers) {
    const operatingSystem = getOperatingSystem();
    return _.map(modifiers, (modifier) => {
        if (!_.has(CONST.KEYBOARD_SHORTCUT_MODIFIERS, modifier)) {
            return modifier;
        }

        const platformModifiers = CONST.KEYBOARD_SHORTCUT_MODIFIERS[modifier];
        return lodashGet(platformModifiers, operatingSystem, platformModifiers.DEFAULT || modifier);
    });
}

/**
 * This module configures a global keyboard event handler.
 *
 * It uses a stack to store event handlers for each key combination. Some additional details:
 *
 * - By default, new handlers are pushed to the top of the stack. If you pass a >0 priority when subscribing to the key event,
 *   then the handler will get pushed further down the stack. This means that priority of 0 is higher than priority 1.
 *
 * - When a key event occurs, we trigger callbacks for that key starting from the top of the stack.
 *   By default, events do not bubble, and only the handler at the top of the stack will be executed.
 *   Individual callbacks can be configured with the shouldBubble parameter, to allow the next event handler on the stack execute.
 *
 * - Each handler has a unique callbackID, so calling the `unsubscribe` function (returned from `subscribe`) will unsubscribe the expected handler,
 *   regardless of its position in the stack.
 */
const KeyboardShortcut = {
    subscribe,
    getDocumentedShortcuts,
};

export default KeyboardShortcut;
