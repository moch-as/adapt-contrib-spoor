define([
    'core/js/adapt',
    'libraries/lz-string'
], function (Adapt, LZString) {

    var oldversion1 = 'ver001';
    var version = 'ver002';
    var versionlen = version.length;

    // Captures the completion status of non-question components

    var serializer = {
        serialize: function() 
        {
            var savestring = this.serializeSaveState();
            var compressed = LZString.compressToBase64(savestring);
            return version + compressed;
        },

        serializeSaveState: function()
        {
            var componentmodels = Adapt.components.filter(function(model){return model.get('_isComplete') && !model.get('_isQuestionType');});            
            var completedIds = _.map(componentmodels, function(model){return model.get('_id');});
            return completedIds.join(",");
        },

        deserialize: function (completion, callback)
        {
            var step_counter = 0;
            var readversion = completion.slice(0, versionlen);
            if ((readversion === version) || (readversion === oldversion1))
            {
                var completiondata = completion.slice(versionlen);
                var completionstring = (readversion === version) ? LZString.decompressFromBase64(completiondata) : LZString.decompressFromUTF16(completiondata);
                var completed_components_id_list = (completionstring !== null) ? completionstring.split(",") : [];
                var list_length = completed_components_id_list.length;
                step();
            }
            else
            {
                console.log('Cannot read completion status from suspend data.');
                callback();
            }

            function step()
            {
                var completed_component_id = completed_components_id_list[step_counter];
                var completed_component = Adapt.components._byAdaptID[completed_component_id];
                if (completed_component)
                {
                    completed_component[0].set('_isComplete', true);
                }
                (step_counter++ === list_length) ? callback() : setTimeout(step);
            }
        }
    };

    return serializer;
});