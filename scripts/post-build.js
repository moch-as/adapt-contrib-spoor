module.exports = function(fs, path, log, options, done) {
    const scormfolders = {'1.2': 'scorm12files/', '2004 3rd Edition': 'scorm20043files/', '2004 4th Edition': 'scorm20044files/'};
    const targetfolder = options.outputdir || process.cwd();
    const configfilename = path.join(targetfolder, 'course/config.json');
    const scriptsourcefolder = path.join(options.plugindir, 'scripts');

    try
    {
        const filecontent = fs.readFileSync(configfilename, 'utf8');
        var configcontent = JSON.parse(filecontent);
        if (getScormConfigItem(configcontent, '_spoor', '_isEnabled'))
        {
            // SCORM version
            const scormversion = getScormConfigItem(configcontent._advancedSettings, '_spoor', '_scormVersion') || '2004';
            const scormedition = (scormversion !== '1.2') ? (getScormConfigItem(configcontent._advancedSettings, '_spoor', '_scorm2004Edition') || '3rd Edition') : '';

            // Manifest values
            let manifestScormId = getScormConfigItem(configcontent._advancedSettings, '_spoor', '_manifestIdentifier') || '*';
            const manifestOrganizationId = getScormConfigItem(configcontent._advancedSettings, '_spoor', '_orgIdentifier') || 'org-main_org';
            const manifestItemId = getScormConfigItem(configcontent._advancedSettings, '_spoor', '_itemIdentifier') || 'item-main_org';
            const manifestOrganizationTitle = getScormConfigItem(configcontent._advancedSettings, '_spoor', '_orgTitle') || 'MOCH Course';
            const manifestItemTitle = getScormConfigItem(configcontent._advancedSettings, '_spoor', '_itemTitle') || 'MOCH Course';

            // Use course ID as SCORM ID if ID is empty or *
            if ((!manifestScormId) || (manifestScormId === '*'))
            {
                manifestScormId = getScormConfigItem(configcontent, '_courseId');
            }

            // Copy SCORM files
            const scormversionname = scormversion + (scormedition ? (' ' + scormedition) : '');
            for (const name in scormfolders) {
                (name != scormversionname) && deleteSourceFilesInTarget(fs, path, path.join(scriptsourcefolder, scormfolders[name]), targetfolder);
            }
            copyDirs(log, fs, path, path.join(scriptsourcefolder, scormfolders[scormversionname]), targetfolder);

            // Fill in manifest file
            const manifestfilename = path.join(targetfolder, 'imsmanifest.xml');
            if (fs.existsSync(manifestfilename))
            {
                let manifestcontent = fs.readFileSync(manifestfilename, 'utf8');
                manifestcontent = replaceManifestItem(manifestcontent, 'scormid', manifestScormId);
                manifestcontent = replaceManifestItem(manifestcontent, 'organizationid', manifestOrganizationId);
                manifestcontent = replaceManifestItem(manifestcontent, 'itemid', manifestItemId);
                manifestcontent = replaceManifestItem(manifestcontent, 'organizationtitle', manifestOrganizationTitle);
                manifestcontent = replaceManifestItem(manifestcontent, 'itemtitle', manifestItemTitle);
                fs.writeFileSync(manifestfilename, manifestcontent, 'utf8');
            }
        }
    }
    catch(err)
    {
        log('SPOOR post-build error: ' + err);
    }
    finally
    {
        done();
    }
};

// utility functions

function getScormConfigItem(configcontent, configkey, itemkey)
{
    if (configkey && itemkey)
    {
        return (configcontent && configcontent[configkey] && configcontent[configkey][itemkey]) ? configcontent[configkey][itemkey] : '';
    }
    else if (configkey)
    {
        return (configcontent && configcontent[configkey]) ? configcontent[configkey] : '';
    }
    else
    {
        return '';
    }
}

function copyDirs(log, fs, path, srcpath, destpath)
{
    const filelist = getFileList(fs, path, srcpath, true);

    filelist.forEach(fileinfo => {
        const sourcefilename = path.join(srcpath, fileinfo.name);
        const destinationfilename = path.join(destpath, fileinfo.name);
        fileinfo.isdir ? fs.mkdirSync(destinationfilename) : fs.copyFileSync(sourcefilename, destinationfilename);
    });
}

function deleteSourceFilesInTarget(fs, path, srcpath, destpath)
{
    const filelist = getFileList(fs, path, srcpath, false);

    filelist.forEach(fileinfo => {
        const targetfilename = path.join(destpath, fileinfo.name);
        const fileexist = fs.existsSync(targetfilename);
        fileexist && (fileinfo.isdir ? fs.rmdirSync(targetfilename) : fs.unlinkSync(targetfilename));
    });
}
    
function getFileList(fs, path, dir, dirfirst = true, root = dir, fileList = [])
{
    const files = fs.readdirSync(dir);
  
    files.forEach((file) => {
        const filePath = path.join(dir, file);
        const fileStat = fs.lstatSync(filePath);
        const relname = filePath.replace(root, '');

        if (fileStat.isDirectory())
        {
            dirfirst && fileList.push({name: relname, isdir: true});
            getFileList(fs, path, filePath, dirfirst, root, fileList);
            !dirfirst && fileList.push({name: relname, isdir: true});
        }
        else
        {
            fileList.push({name: relname, isdir: false});
        }
    });
  
    return fileList;
}

function replaceManifestItem(manifestcontent, key, value)
{
    var searchkey = '@@' + key;
    return key ? manifestcontent.replace(new RegExp(searchkey, 'g'), value) : manifestcontent;
}
