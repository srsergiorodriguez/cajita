import { Menu, Submenu, PredefinedMenuItem } from '@tauri-apps/api/menu';

export async function setMenu() {
  try {
    // 1. App Menu (Already working)
    const aboutItem = await PredefinedMenuItem.new({ item: { About: null } });
    const quitItem = await PredefinedMenuItem.new({ item: 'Quit' });
    const appSubmenu = await Submenu.new({
      text: 'motivomotivo',
      items: [aboutItem, await PredefinedMenuItem.new({ item: 'Separator' }), quitItem]
    });

    // 2. The "Hidden" Edit Menu (Necessary for macOS Clipboard)
    const editSubmenu = await Submenu.new({
      text: 'Edit',
      items: [
        await PredefinedMenuItem.new({ item: 'Undo' }),
        await PredefinedMenuItem.new({ item: 'Redo' }),
        await PredefinedMenuItem.new({ item: 'Separator' }),
        await PredefinedMenuItem.new({ item: 'Cut' }),
        await PredefinedMenuItem.new({ item: 'Copy' }),
        await PredefinedMenuItem.new({ item: 'Paste' }),
        await PredefinedMenuItem.new({ item: 'SelectAll' })
      ]
    });

    const menu = await Menu.new({
      items: [appSubmenu, editSubmenu],
    });

    await menu.setAsAppMenu();
  } catch (err) {
    console.error("❌ Menu Error:", err);
  }
}