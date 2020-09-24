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
    var Autocomplete = require("./autocomplete").Autocomplete;
    require("./multi_select"); // completions have an implicit dependency on this being loaded
    var VirtualRenderer = require("./virtual_renderer").VirtualRenderer;
    var langTools = require("./ext/language_tools");
    var JavaScriptMode = require("./mode/javascript").Mode;
    var TextMode = require("./mode/text").Mode;
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
        // this browser test is based on the guard ace uses to guard `require("amd-loader")` at the top of test files
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
                // ensure we close the suggestions so the don't interfere with other tests
                editor.completer.insertMatch();
            } catch(e) {
                next(e)
            }
            next()
        },

        'test empty-value completions': function(next) {
            var textMode = new TextMode();
            textMode.getCompletions = function() {
                return [{
                    caption: "This_completion_inserts_nothing",
                    value: ""
                }];
            };

            var doc = new EditSession([], textMode);
            editor.setSession(doc);
            editor.completer = new Autocomplete();
            exec("insertstring", 1, "This");
            editor.execCommand("startAutocomplete");

            try {
                assert.ok(editor.completer.popup, "should have a completer popup");
                assert.ok(editor.completer.popup.isOpen);
                assertContainsSuggestion(editor.completer.completions.filtered, "This_completion_inserts_nothing");
                editor.completer.insertMatch();
                assert.equal(editor.getValue(), "This", "Should insert nothing for empty-string valued completions");
            } catch(e) {
                next(e)
            }
            next()
        },

        'test emptyMessage autocomplete': function(next) {
            try {
                // by default, this editor will have no suggestions
                editor.setValue("");

                editor.execCommand("startAutocomplete");
                assert.ok(!editor.completer.popup, "should not have a completer popup when there are no suggestions");

                editor.completer.emptyMessage = function(prefix) {
                    return prefix ? "No suggestions for: " + prefix : "No suggestions";
                };

                editor.execCommand("startAutocomplete");
                assert.ok(editor.completer.popup, "should have a completer popup if emptyMessage function is defined");
                assert.ok(editor.completer.popup.isOpen);
                assert.equal(editor.completer.completions.filtered.length, 1);
                assert.equal(editor.completer.completions.filtered[0].caption,
                    "No suggestions",
                    "should display message generated by emptyMessage when there are no completions");
                assert.equal(editor.completer.completions.filtered[0].value, "",
                    "should have nothing to insert from the emptyMessage suggestion");

                exec("insertstring", 1, "test_prefix");
                editor.execCommand("startAutocomplete");
                assert.equal(editor.completer.completions.filtered.length, 1);
                assert.equal(editor.completer.completions.filtered[0].caption,
                    "No suggestions for: test_prefix",
                    "should have access to `prefix` in emptyMessage function");
            } catch(e) {
                next(e)
            }
            next();
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
