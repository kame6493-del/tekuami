import Foundation
import SwiftUI

/// アプリ本体とウィジェット拡張の両方に入れる共有コード。
/// 置き場は App Group(group.jp.tekuami.app)の UserDefaults。中身は src/platform/widget.ts の WidgetSnapshot と同じ形の JSON。
enum TekuamiShared {
    static let appGroup = "group.jp.tekuami.app"
    static let snapshotKey = "snapshot"

    static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

    struct Snapshot: Codable, Hashable {
        var v: Int
        var toNext: Int
        var rowSteps: Int
        var today: Int
        var rowsDone: Int
        var rowsTotal: Int
        var item: String
        var main: String
        var sub: String
        var theme: String
        var updatedAt: Double

        static let sample = Snapshot(v: 1, toNext: 287, rowSteps: 500, today: 3214, rowsDone: 14, rowsTotal: 36, item: "マフラー", main: "#F5EAD6", sub: "#D65750", theme: "hidamari", updatedAt: 0)
        static let empty = Snapshot(v: 1, toNext: 0, rowSteps: 500, today: 0, rowsDone: 0, rowsTotal: 0, item: "", main: "#F5EAD6", sub: "#D65750", theme: "hidamari", updatedAt: 0)

        /// 今の段で編めた割合(0〜1)
        var frac: Double {
            guard rowSteps > 0, !item.isEmpty else { return 0 }
            return max(0, min(1, Double(rowSteps - toNext) / Double(rowSteps)))
        }
    }

    static func read() -> Snapshot {
        guard let s = defaults?.string(forKey: snapshotKey),
              let d = s.data(using: .utf8),
              let snap = try? JSONDecoder().decode(Snapshot.self, from: d) else { return .empty }
        return snap
    }

    static func write(json: String) {
        defaults?.set(json, forKey: snapshotKey)
    }
}
