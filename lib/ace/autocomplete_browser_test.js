if (typeof process !== "undefined") {
    require("amd-loader");
}

/**
 * In-browser-only tests for completions.  See the doc on `browserGuard` below for instructions on how to run.
 */
define(function(require, exports, module) {
    "use strict";

    var assert = require("./test/assertions");
    var Editor = require("./editor").Editor;
    var EditSession = require("./edit_session").EditSession;
    require("./multi_select"); // completions have an implicit dependency on this being loaded
    var VirtualRenderer = require("./virtual_renderer").VirtualRenderer;
    var langTools = require("./ext/language_tools");
    var JavaScriptMode = require("./mode/javascript").Mode;
    var editor;
    var exec = function(name, times, args) {
        do {
            editor.commands.exec(name, editor, args);
        } while(times --> 1);
    };

    var assertContainsSuggestion = function(completions, suggestion_caption, msg) {
        msg = msg || '';
        var captions = completions.map(function(comp) { return comp.caption ? comp.caption : comp.value });
        var contains_suggestion = false;
        captions.forEach(function(caption) {
            if (caption === suggestion_caption) {
                contains_suggestion = true;
            }
        });
        assert.ok(contains_suggestion,
            'Expected [' + completions.map(function(comp) { return comp.caption; }) + '] to contain "' + suggestion_caption + '".'
            + '\n' + msg);
    };

    /**
     * Ensures this test only runs in the browser.  Instructions to run:
     *
     * - In the root of the project, run `python -m SimpleHTTPServer`
     * - Visit `http://localhost:8000/lib/ace/test/tests.html?ace/autocomplete_browser_test` to run
     */
    var isBrowser = function() {
        // this brower test is based on the guard ace uses to guard `require("amd-loader")` at the top of test files
        if (typeof process !== "undefined") {
            console.log("Skipping tests: This test only runs in the browser.  See this file for instructions on running.");
            return false
        }
        return true
    }

    var test_collection = {
        setUp: function(next) {
            editor = new Editor(new VirtualRenderer());
            editor.completers = [langTools.keyWordCompleter];
            editor.session.setUseWorker(false);
            editor.$blockScrolling = Infinity;
            editor.setOptions({
                enableBasicAutocompletion: true,
                enableLiveAutocompletion: true,
                enableSnippets: false
            });
            next();
        },

        'test basic completions': function(next) {
            var doc = new EditSession([], new JavaScriptMode());
            editor.setSession(doc);
            exec("insertstring", 1, "func");

            editor.execCommand("startAutocomplete");
            try {
                assert.ok(editor.completer.popup, "should have a completer popup");
                assert.ok(editor.completer.popup.isOpen);
                assertContainsSuggestion(editor.completer.completions.filtered, "function");
            } catch(e) {
                next(e)
            }
            next()
        }
    }

    if (isBrowser()) {
        module.exports = test_collection
    } else {
        module.exports = {}
    }
});

if (typeof module !== "undefined" && module === require.main) {
    require("asyncjs").test.testcase(module.exports).exec()
}
