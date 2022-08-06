
namespace Cover
{
	/** */
	export async function coverBuildDev()
	{
		log("Building the development version...");
		
		const defs = new Defs();
		emitHtml(Dir.build, ConstS.jsFileNameApp);
		await emitPlayerJs(Dir.build, defs);
		copyDependencies(Dir.build);
	}
	
	/** */
	export async function coverBuildWeb()
	{
		log("Building minified web version...");
		
		const defs = new Defs();
		emitHtml(Dir.bundleWeb, ConstS.jsFileNameAppMin);
		await emitAppJs(Dir.bundleWeb, defs);
		await emitPlayerJs(Dir.bundleWeb, defs);
		copyDependencies(Dir.bundleWeb);
	}
	
	/** */
	export async function coverBuildWebDebuggable()
	{
		log("Building non-minified web version...");
		
		emitHtml(Dir.bundleWeb, ConstS.jsFileNameApp);
		await emitAppJs(Dir.bundleWeb);
		await emitPlayerJs(Dir.bundleWeb);
		copyDependencies(Dir.bundleWeb);
	}
	
	/** */
	export async function coverBuildMac()
	{
		log("Building macOS desktop app (this may take a while)...");
		
		const defs = new Defs({
			TAURI: true,
			MACOS: true
		});
		
		emitHtml(Dir.bundleMacOS, ConstS.jsFileNameApp);
		await emitAppJs(Dir.bundleMacOS, defs);
		await emitPlayerJs(Dir.bundleMacOS, defs);
		await emitMacInstaller(Dir.bundleMacOS);
		copyDependencies(Dir.bundleMacOS);
	}
	
	/** */
	export async function coverBuildWindows()
	{
		log("Building Windows desktop app (this may take a while)...");
		
		const defs = new Defs({
			TAURI: true,
			WINDOWS: true
		});
		
		emitHtml(Dir.bundleWindows, ConstS.jsFileNameApp);
		await emitAppJs(Dir.bundleWindows, defs);
		await emitPlayerJs(Dir.bundleWindows, defs);
		copyDependencies(Dir.bundleWindows);
	}
	
	//# Helper Functions
	
	/** */
	function copyDependencies(targetDirectory: string)
	{
		const copyOne = (fileName: string) =>
		{
			const targetPath = Path.join(targetDirectory, fileName);
			Fs.copyFileSync(Path.join(Dir.lib, fileName), targetPath);
			log("Copied dependency to: " + targetPath);
		}
		
		copyOne("trix.js");
		copyOne("res.blur-black.png");
		copyOne("res.blur-white.png");
	}
	
	/** */
	async function emitMacInstaller(saveDirectory: string)
	{
		Fs.mkdirSync(saveDirectory, { recursive: true });
		
		log("Writing macOS app bundle. This may take a while...");
		Proc.execSync("npm run tauri build");
		
		const files = Fs.readdirSync(Dir.tauriDmg, "utf8").filter(name => name.endsWith(".dmg"));
		
		for (const file of files)
		{
			Fs.copyFileSync(
				Path.join(Dir.tauriDmg, file),
				Path.join(saveDirectory, file));
		}
	}
	
	/** */
	async function emitWindowsInstaller(saveDirectory: string)
	{
		Fs.mkdirSync(saveDirectory, { recursive: true });
		
	}
	
	/** */
	function emitHtml(saveDirectory: string, appJsFileName: string)
	{
		Fs.mkdirSync(saveDirectory, { recursive: true });
		
		const lines = [
			`<!DOCTYPE html>`,
			`<html lang="en-us" data-autostart>`,
			`<meta charset="utf-8">`,
			`<meta name="theme-color" content="#000000">`,
			`<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">`,
			`<meta name="apple-mobile-web-app-capable" content="yes">`,
			`<script src="${appJsFileName}"></script>`,
			`</html>`
		].join("\n");
		
		const targetPath = Path.join(saveDirectory, ConstS.htmlFileName);
		Fs.writeFileSync(targetPath, lines);
		log("Wrote HTML file to: " + targetPath);
	}
	
	/** */
	async function emitAppJs(saveDirectory: string, defs?: Defs)
	{
		Fs.mkdirSync(saveDirectory, { recursive: true });
		
		Proc.execSync("tsc");
		const inJsFilePath = Path.join(Dir.build, ConstS.jsFileNameApp);
		const inJsCode = Fs.readFileSync(inJsFilePath, "utf8");
		
		const targetPath = Path.join(saveDirectory, ConstS.jsFileNameApp);
		Fs.writeFileSync(targetPath, inJsCode);
		log("Wrote App JS file to: " + targetPath);
		
		if (defs)
		{
			const minifiedCode = await minify(inJsCode, defs);
			const targetPathMin = Path.join(saveDirectory, ConstS.jsFileNameAppMin);
			Fs.writeFileSync(targetPathMin, minifiedCode);
			log("Wrote App JS file to: " + targetPathMin);
		}
	}
	
	/** */
	export async function emitPlayerJs(saveDirectory: string, defs?: Defs)
	{
		Fs.mkdirSync(saveDirectory, { recursive: true });
		Fs.mkdirSync(Dir.temp, { recursive: true });
		
		// Stores the files to include in the player JS file,
		// with paths relative to the ./core/player directory.
		const copyFiles = [
			...Fs.readdirSync(Dir.player),
			"../!.ts",
			"../Definitions.ts",
		];
		
		for (const sourceFileName of copyFiles)
		{
			if (!sourceFileName.endsWith(".ts"))
				continue;
			
			const sourcePath = Path.join(Dir.player, sourceFileName);
			const targetPath = Path.join(Dir.temp, Path.basename(sourcePath));
			Fs.copyFileSync(sourcePath, targetPath);
		}
		
		const tsConfigPath = Path.join(Dir.temp, "tsconfig.json");
		Fs.writeFileSync(tsConfigPath, JSON.stringify(
			{
				"compilerOptions": {
					"outFile": "./" + ConstS.jsFileNamePlayer,
					"module": "system",
					"moduleResolution": "node",
					"declaration": false,
					"target": "es5",
				},
				"include": [
					"*.ts"
				]
			},
			null, "\t"));
		
		Proc.execSync("tsc", { cwd: Dir.temp });
		
		const inJsFilePath = Path.join(Dir.temp, ConstS.jsFileNamePlayer);
		const inJsCode = Fs.readFileSync(inJsFilePath, "utf8");
		const outJsFilePath = Path.join(saveDirectory, ConstS.jsFileNamePlayer);
		Fs.writeFileSync(outJsFilePath, inJsCode);
		log("Wrote Player JS file to: " + outJsFilePath);
		Fs.rmdirSync(Dir.temp, { recursive: true });
		
		if (defs)
		{
			const minifiedCode = await minify(inJsCode, defs);
			const outJsFilePathMin = Path.join(saveDirectory, ConstS.jsFileNamePlayerMin);
			Fs.writeFileSync(outJsFilePathMin, minifiedCode);
			log("Wrote Player JS file to: " + outJsFilePathMin);
		}
	}
	
	/** */
	async function minify(jsCode: string, defs: Defs)
	{
		const minified = await Terser.minify(jsCode, {
			compress: {
				unsafe_math: true,
				drop_console: true,
				global_defs: defs
			},
			sourceMap: false,
		});
		
		return minified.code || "";
	}
	
	const Fs = require("fs") as typeof import("fs");
	const Path = require("path") as typeof import("path");
	const Proc = require("child_process") as typeof import("child_process");
	const Terser = require("terser") as typeof import("terser");
	
	/** */
	export function log(value: string)
	{
		console.log(value);
		
		if (typeof document !== "undefined")
		{
			document.body.append(Htx.div(
				{
					padding: "10px",
					margin: "10px",
					backgroundColor: "#EEE",
					fontFamily: "sans-serif",
					fontSize: "20px"
				},
				new Text(value)
			));
		}
	}
	
	/** */
	export namespace Dir
	{
		export const cwd = process.cwd();
		
		export const build = Path.join(cwd, "build");
		export const player = Path.join(cwd, "core", "player");
		export const temp = Path.join(cwd, "+");
		export const bundle = Path.join(cwd, "+bundle");
		export const tauriDmg = Path.join(Dir.cwd, "src-tauri", "target", "release", "bundle", "dmg");
		export const lib = Path.join(cwd, "lib");
		
		export const bundleWeb = Path.join(bundle, "web");
		export const bundleMacOS = Path.join(bundle, "macOS");
		export const bundleWindows = Path.join(bundle, "windows");
		export const bundleLinux = Path.join(bundle, "linux");
		export const bundleIOS = Path.join(bundle, "iOS");
		export const bundleAndroid = Path.join(bundle, "android");
	};
	
	/** */
	class Defs
	{
		constructor(defs: Partial<Defs> = {})
		{
			Object.assign(this, defs);
		}
		
		readonly DEBUG: boolean = false;
		readonly ELECTRON: boolean = false;
		readonly TAURI: boolean = false;
		readonly WINDOWS: boolean = false;
		readonly MACOS: boolean = false;
		readonly LINUX: boolean = false;
		readonly IOS: boolean = false;
		readonly ANDROID: boolean = false;
	}
}