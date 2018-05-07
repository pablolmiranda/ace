/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */
if (typeof process !== "undefined") {
    require("amd-loader");
}

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

    module.exports = {
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
            if (require.undef) {
                console.log("Skipping test: This test only runs in the browser");
                next();
                return;
            }
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
        },

        'test empty-value completions': function(next) {
            if (require.undef) {
                console.log("Skipping test: This test only runs in the browser");
                next();
                return;
            }
            var textMode = new TextMode();
            textMode.getCompletions = function() {
                return [{
                    caption: "This_completion_inserts_nothing",
                    value: ""
                }];
            };

            try {
                var doc = new EditSession([], textMode);
                editor.setSession(doc);
                editor.completer = new Autocomplete();
                exec("insertstring", 1, "This");
                editor.execCommand("startAutocomplete");
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
            if (require.undef) {
                console.log("Skipping test: This test only runs in the browser");
                next();
                return;
            }

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
});

if (typeof module !== "undefined" && module === require.main) {
    require("asyncjs").test.testcase(module.exports).exec()
}
