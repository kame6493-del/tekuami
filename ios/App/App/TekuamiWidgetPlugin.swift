import Capacitor
import Foundation
import WidgetKit

/// src/platform/widget.ts の TekuamiWidget の iOS 側。MainViewController で登録する
@objc(TekuamiWidgetPlugin)
public class TekuamiWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TekuamiWidgetPlugin"
    public let jsName = "TekuamiWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSnapshot", returnType: CAPPluginReturnPromise),
    ]

    @objc func setSnapshot(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("json がありません")
            return
        }
        TekuamiShared.write(json: json)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
