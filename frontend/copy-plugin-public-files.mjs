import fs from "fs/promises";

const plugins = await fs.readdir("./plugins", {withFileTypes: true});

for (const pluginDirEnt of plugins) {
    if (pluginDirEnt.isDirectory) {
        const pluginId = pluginDirEnt.name;
        const pluginPublicDir = `./plugins/${pluginId}/plugin-public/`;
        let publicFiles = [];
        try {
            publicFiles = await fs.readdir(pluginPublicDir, {withFileTypes: true});
        } catch (err) {}
        for (const publicFileEnt of publicFiles) {
            await fs.mkdir(`./public/pl/${pluginId}/`, {recursive: true});
            await fs.copyFile(`${pluginPublicDir}${publicFileEnt.name}`, `./public/pl/${pluginId}/${publicFileEnt.name}`);
        }
    }
}
