/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 (the "License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
 * License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is Komodo code.
 * 
 * The Initial Developer of the Original Code is ActiveState Software Inc.
 * Portions created by ActiveState Software Inc are Copyright (C) 2000-2007
 * ActiveState Software Inc. All Rights Reserved.
 * 
 * Contributor(s):
 *   ActiveState Software Inc
 * 
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

var log = ko.logging.getLogger("pref-javascript");
//log.setLevel(ko.logging.LOG_INFO);

function PrefJavaScript_OnLoad() {
    parent.initPanel();
}

function OnPreferencePageLoading() {
    var extraPaths = document.getElementById("javascriptExtraPaths");
    extraPaths.init(); // must happen after onpageload
}

// Find the user's Firefox installation and install the Komodo JavaScript
// Debugger support extension (and any of its dependencies).
function PrefJavaScript_InstallFFExtension()
{
    log.debug("PrefJavaScript_InstallFFExtension");
    try {
        var koWebbrowser = Components.classes['@activestate.com/koWebbrowser;1'].
                getService(Components.interfaces.koIWebbrowser);
        var firefoxes = koWebbrowser.get_firefox_paths(new Object());
        
        var firefox_path = null;
        if (firefoxes.length == 0) {
            var msg = "Could not find a Firefox installation on your system. "
                      +"Would you like to browse for a Firefox "
                      +"installation with which to install the extensions?";
            var answer = ko.dialogs.customButtons(msg, ["&Browse...", "Cancel"],
                                              "Browse...");
            if (answer == "Browse...") {
                var infoSvc = Components.classes["@activestate.com/koInfoService;1"].getService();
                var platform = infoSvc.platform;
                var firefox_exe_name = null;
                if (platform.match(/^win/)) {
                    firefox_exe_name = "firefox.exe";
                } else if (platform.match(/^darwin/)) {
                    firefox_exe_name = "Firefox.app";
                } else {
                    firefox_exe_name = "firefox";
                }
                firefox_path = ko.filepicker.openExeFile(null, firefox_exe_name,
                                                      "Browse for Firefox");
                if (firefox_path == null) {
                    return false;
                }
            }
        }
        //else if (firefoxes.length > 1) {
        //    //XXX Should we select from list? For now will pick the first one.
        //}
        else {
            firefox_path = firefoxes[0];
        }

        var koDirSvc = Components.classes["@activestate.com/koDirs;1"].getService();
        var osPathSvc = Components.classes["@activestate.com/koOsPath;1"].getService();
        var jslib_xpi = osPathSvc.joinlist(3,
                [koDirSvc.supportDir, "modules", "jslib.xpi"]);
        var kjsd_xpi = osPathSvc.joinlist(3,
                [koDirSvc.supportDir, "modules",
                 "komodo_javascript_debugger.xpi"]);
        
        koWebbrowser.install_firefox_xpis(firefox_path, 2,
                                          [jslib_xpi, kjsd_xpi]);
        
        // - It would be nice to popup a dialog on pass/fail doing an
        //   appropriate thing. XXX
    } catch(ex) {
        log.exception(ex);
    }
    return true;
}

function _pref_lint_setElementEnabledState(elt, enabled) {
    if (enabled) {
        if (elt.hasAttribute('disabled')) {
            elt.removeAttribute('disabled');
        }
    } else {
        elt.setAttribute('disabled', true);
    }
}

function pref_lint_doWarningEnabling() {
    var warningsEnabledCheckbox = document.getElementById('lintJavaScriptEnableWarnings');
    var strictEnabledCheckbox = document.getElementById('lintJavaScriptEnableStrict');
    var enabled = warningsEnabledCheckbox.checked;
    _pref_lint_setElementEnabledState(strictEnabledCheckbox, enabled);
}
    
var goodPartsFactorySettings = {
    white: "true",
    indent: "4",
    onevar: "true",
    'undef': "true",
    cap: "true",
    nomen: "true",
    regexp: "true",
    plusplus: "true",
    bitwise: "true"
};

var otherStrictSettings = {
    strict: "true",
    passfail: "true",
    browser: "false",
    devel: "false",
    rhino: "false",
    widget: "false",
    windows: "false",
    'debug': "false",
    evil: "false",
    forin: "false",
    subscript: "false",
    'continue': "false",
    css: "false",
    htmlCase: "false",
    on: "false",
    fragment: "false",
    es5: "false" 
};

function updateSettings(optName, optValue, settingNames, settings) {
    if (settingNames.indexOf(optName) === -1) {
        settingNames.push(optName);
    }
    settings[optName] = optValue;
}

function setCurrentSettings(text, settingNames, settings) {
    var i, idx, opt, optName, optValue;
    var options = text.split(/\s+/);
    for (i = 0; i < options.length; i++) {
        opt = options[i];
        idx = opt.indexOf("=");
        if (idx >= 0) {
            optName = opt.substr(0, idx);
            optValue = opt.substr(idx + 1);
            updateSettings(optName, optValue, settingNames, settings);
        } else {
            settingNames.push(opt);
        }
    }
}

function addSettings(factorySettings, settingNames, settings) {
    var optName, optValue;
    for (optName in factorySettings) {
        optValue = factorySettings[optName].toString();
        updateSettings(optName, optValue, settingNames, settings);
    }
}

function addParts(includeOtherStrictSettings) {
    var optName, i, idx, name, newTextParts;
    var textField = document.getElementById("jslintOptions");
    var currentSettings = {};
    var currentSettingNames = [];
    var text = textField.value;
    setCurrentSettings(text, currentSettingNames, currentSettings);
    addSettings(goodPartsFactorySettings, currentSettingNames, currentSettings);
    if (includeOtherStrictSettings) {
        addSettings(otherStrictSettings, currentSettingNames, currentSettings);
    } else {
        // Remove any factory strict settings from the text view
        for (optName in otherStrictSettings) {
            idx = currentSettingNames.indexOf(optName);
            if (idx > -1 && currentSettings[optName] === otherStrictSettings[optName]) {
                currentSettingNames.splice(idx, 1);
            }
        }
    }
    newTextParts = currentSettingNames.map(function (name) {
        if (name in currentSettings) {
            return name + "=" + currentSettings[name];
        } else {
            return name;
        }
    });
    textField.value = newTextParts.join(" ");
}

function addGoodParts() {
    addParts(false);
}

function addAllOptions() {
    addParts(true);
}

var allJSHintStrictSettings = {
    // adsafe     : true, // if ADsafe should be enforced
    asi: "false", // true if automatic semicolon insertion should be tolerated
    bitwise    : "true", // if bitwise operators should not be allowed
    boss       : "true", // if advanced usage of assignments and == should be allowed
    browser    : "false", // if the standard browser globals should be predefined
    cap        : "false", // if upper case HTML should be allowed
    couch      : "false", // if CouchDB globals should be predefined
    css        : "false", // if CSS workarounds should be tolerated
    curly      : "true", // if curly braces around blocks should be required (even in if/for/while)
    debug      : "false", // if debugger statements should be allowed
    devel      : "false", // if logging should be allowed (console, alert, etc.)
    eqeqeq     : "true", // if === should be required
    es5        : "false", // if ES5 syntax should be allowed
    evil       : "false", // if eval should be allowed
    forin      : "true", // if for in statements must filter
    fragment   : "false", // if HTML fragments should be allowed
    immed      : "true", // if immediate invocations must be wrapped in parens
    jquery     : "false", // if jQuery globals should be predefined
    latedef    : "true", // if the use before definition should not be tolerated
    laxbreak   : "false", // if line breaks should not be checked
    loopfunc   : "false", // if functions should be allowed to be defined within loops
    newcap     : "true", // if constructor names must be capitalized
    noarg      : "true", // if arguments.caller and arguments.callee should be disallowed
    node       : "false", // if the Node.js environment globals should be predefined
    noempty    : "false", // if empty blocks should be disallowed
    nonew      : "false", // if using `new` for side-effects should be disallowed
    nomen      : "false", // if names should be checked
    on         : "true", // if HTML event handlers should be allowed
    onevar     : "false", // if only one var statement per function should be allowed
    passfail   : "true", // if the scan should stop on first error
    plusplus   : "true", // if increment/decrement should not be allowed
    regexp     : "true", // if the . should not be allowed in regexp literals
    rhino      : "false", // if the Rhino environment globals should be predefined
    undef      : "true", // if variables should be declared before used
    safe       : "true", // if use of some browser features should be restricted
    shadow     : "false", // if variable shadowing should be tolerated
    windows    : "false", // if MS Windows-specific globals should be predefined
    strict     : "true", // require the "use strict"; pragma
    sub        : "false", // if all forms of subscript notation are tolerated
    white      : "true", // if strict whitespace rules apply
    widget     : "false"  // if the Yahoo Widgets globals should be predefined

};


function addAllJSHintOptions() {
    
    var optName, i, idx, name, newTextParts;
    var textField = document.getElementById("jshintOptions");
    var currentSettings = {};
    var currentSettingNames = [];
    var text = textField.value;
    setCurrentSettings(text, currentSettingNames, currentSettings);
    addSettings(allJSHintStrictSettings, currentSettingNames, currentSettings);
    newTextParts = currentSettingNames.map(function (name) {
        if (name in currentSettings) {
            return name + "=" + currentSettings[name];
        } else {
            return name;
        }
    });
    textField.value = newTextParts.join(" ");
}
