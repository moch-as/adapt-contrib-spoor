define([
    'core/js/adapt',
    'libraries/lz-string',
    './scormSuspendDataSerializer'
], function (Adapt, LZString) {

    var oldversion1 = 'ver001';
    var version = 'ver002';
    var versionlen = version.length;

    // Captures the completion status and user selections of the question components

    var is_completed_persistent_question = {
        '_isQuestionType': true,
        '_isResetOnRevisit': "false",
        '_isComplete': true,
        '_isInteractionComplete': true
    };

    var serializer = {
        serialize: function()
        {
            var savestring = this.serializeSaveState();
            var compressed = LZString.compressToBase64(savestring);
            return version + compressed;
        },

        serializeSaveState: function()
        {
            var serializeddata = "";
            try
            {
                var data = this.getQuestionStateData();
                if (data.length !== 0)
                {
                    serializeddata = JSON.stringify(data);
                }
            }
            catch(e)
            {
                console.error(e);
            }
            return serializeddata;
        },

        getQuestionStateData: function()
        {
            var data = [];
            var questioncomponentmodels = Adapt.components.where(is_completed_persistent_question);
            _.each(questioncomponentmodels, function(componentmodel)
            {
                var componentdata = componentmodel.toJSON();
                var dataitem = {
                    id: componentdata['_id'],
                    sc: componentdata['_score'] || 0,
                    al: componentdata['_attemptsLeft'] || 0,
                    su: componentdata['_isSubmitted'],
                    co: componentdata['_isCorrect'] || false,
                    ua: componentdata['_userAnswer']
                }
                data.push(dataitem);
            });
            return data;
        },

        deserialize: function(completion)
        {
            var readversion = completion.slice(0, versionlen);
            if ((readversion === version) || (readversion === oldversion1))
            {
                var completiondata = completion.slice(versionlen);
                try
                {
                    var completionstring = (readversion === version) ? LZString.decompressFromBase64(completiondata) : LZString.decompressFromUTF16(completiondata);
                    var dataarray = (!completionstring) ? [] : JSON.parse(completionstring);
                    if (!this.setQuestionStateData(dataarray))
                    {
                        console.log('Cannot read question status from suspend data.');
                    }
                }
                catch(e)
                {
                    console.error(e);
                }
            }
            else
            {
                console.log('Cannot read question status from suspend data.');
            }
        },

        setQuestionStateData: function(dataarray)
        {
            var isarray = (!Array.isArray) ? (Object.prototype.toString.call(dataarray) === '[object Array]') : Array.isArray(dataarray);
            if (isarray)
            {
                for (var i = 0, arraylen = dataarray.length; i < arraylen; i++)
                {
                    var dataitem = dataarray[i];
                    var questioncomponent = Adapt.components.findWhere({_id: dataitem.id});
                    if (questioncomponent)
                    {
                        questioncomponent.set("_isComplete", true);
                        questioncomponent.set("_isInteractionComplete", true);
                        questioncomponent.set("_isSubmitted", dataitem.su);
                        questioncomponent.set("_score", dataitem.sc);
                        questioncomponent.set("_isCorrect", dataitem.co);
                        questioncomponent.set("_attemptsLeft", dataitem.al);
                        if (dataitem.ua)
                        {
                            questioncomponent.set("_userAnswer", dataitem.ua);
                        }
                    }
                }
            }
            return isarray;
        }
    };

    return serializer;
});
