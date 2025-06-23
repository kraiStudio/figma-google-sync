figma.showUI(__html__, { width: 500, height: 540 });

async function applyImageToNode(node: SceneNode, url: string) {
  try {
    figma.ui.postMessage({ type: 'fetchImage', url });

    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const handler = (msg: any) => {
        if (msg.type === 'fetchImageResult' && msg.url === url) {
          figma.ui.off('message', handler);
          msg.success ? resolve(msg.data) : reject(new Error(msg.error));
        }
      };
      figma.ui.on('message', handler);
    });

    const uint8Array = new Uint8Array(arrayBuffer);
    const image = figma.createImage(uint8Array);

if ('fills' in node && Array.isArray(node.fills)) {
  const fills = JSON.parse(JSON.stringify(node.fills)) as Paint[];

  // Найти индекс верхнего (последнего) слоя типа IMAGE
  const lastImageIndex = [...fills]
    .map((paint, index) => paint.type === 'IMAGE' ? index : -1)
    .filter(index => index !== -1)
    .pop();

  const newImagePaint: ImagePaint = {
    type: 'IMAGE',
    imageHash: image.hash,
    scaleMode: 'FILL',
    opacity: 1,
  };

  if (lastImageIndex !== undefined) {
    fills[lastImageIndex] = newImagePaint;
  } else {
    fills.push(newImagePaint); // Добавить новый слой поверх остальных
  }

  node.fills = fills;
}


    return true;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Error loading image from ${url}:`, msg);
    return false;
  }
}

// ОБНОВЛЕННАЯ ФУНКЦИЯ - ГЛАВНОЕ ИЗМЕНЕНИЕ
async function updateLayers(node: SceneNode, data: Record<string, any>) {
  if ((node.type === "RECTANGLE" || node.type === "FRAME") && node.name === "#image") {
    // Для прямоугольников/фреймов - загружаем картинку из URL
    if (typeof data.image === 'string' && data.image.startsWith('http')) {
      await applyImageToNode(node, data.image);
    }
  } else if (node.type === "TEXT" && node.name.startsWith("#")) {
    try {
      const key = node.name.substring(1);
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        await figma.loadFontAsync(node.fontName as FontName);
        const value = String(data[key]);
        
        // Если значение - URL, добавляем гиперссылку (текст не меняем)
        if (value.startsWith('http')) {
          // Создаем объект гиперссылки
          const hyperlink: HyperlinkTarget = {
            type: 'URL',
            value: value
          };
          
          // Устанавливаем гиперссылку
          if ('hyperlink' in node) {
            node.hyperlink = hyperlink;
          }
        } else {
          // Если не URL - просто обновляем текст
          node.characters = value;
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`Error updating text layer ${node.name}:`, msg);
    }
  }

  if ('children' in node) {
    for (const child of node.children) {
      await updateLayers(child, data);
    }
  }
}

async function createDataInstances(component: ComponentNode | InstanceNode, data: any[]) {
  const instances: InstanceNode[] = [];
  let yPosition = 0;
  const spacing = 40;

  if (component.type === "INSTANCE") {
    const master = await component.getMainComponentAsync();
    if (!master) {
      throw new Error("Selected instance doesn't have a master component");
    }
    
    await updateLayers(component, data[0]);
    yPosition = component.y + component.height + spacing;
    
    for (let i = 1; i < data.length; i++) {
      const instance = master.createInstance();
      await updateLayers(instance, data[i]);
      instance.x = component.x;
      instance.y = yPosition;
      yPosition += instance.height + spacing;
      instances.push(instance);
    }
  } else if (component.type === "COMPONENT") {
    for (const item of data) {
      const instance = component.createInstance();
      await updateLayers(instance, item);
      instance.x = 100;
      instance.y = yPosition;
      yPosition += instance.height + spacing;
      instances.push(instance);
    }
  }

  return instances;
}

async function fetchData() {
  try {
    figma.ui.postMessage({ type: 'fetchJson', url: 'https://your-vercel-url.vercel.app/proxy' });

    const data = await new Promise<any>((resolve, reject) => {
      const handler = (msg: any) => {
        if (msg.type === 'fetchJsonResult') {
          figma.ui.off('message', handler);
          msg.success ? resolve(msg.data) : reject(new Error(msg.error));
        }
      };
      figma.ui.on('message', handler);
    });

    return Array.isArray(data) ? data : [data];
  } catch (error) {
    throw error;
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'getData') {
    try {
      const data = await fetchData();
      figma.ui.postMessage({
        type: 'response',
        data: {
          success: true,
          message: `Data loaded: ${data.length} items`,
          action: 'getData'
        }
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      figma.notify(`Error: ${msg}`, { error: true });
      figma.ui.postMessage({
        type: 'response',
        data: { 
          error: msg,
          action: 'getData'
        }
      });
    }
  } else if (msg.type === 'sync') {
    try {
      const selected = figma.currentPage.selection[0];
      if (!selected || (selected.type !== "COMPONENT" && selected.type !== "INSTANCE")) {
        throw new Error("Please select a master component or instance first");
      }

      const data = await fetchData();
      const instances = await createDataInstances(selected, data);

      if (selected.type === "COMPONENT") {
        figma.currentPage.selection = instances;
        figma.viewport.scrollAndZoomIntoView(instances);
      } else {
        figma.currentPage.selection = [selected, ...instances];
        figma.viewport.scrollAndZoomIntoView([selected, ...instances]);
      }

      figma.ui.postMessage({
        type: 'response',
        data: {
          success: true,
          message: `Created ${instances.length} instances`,
          action: 'sync'
        }
      });

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      figma.notify(`Error: ${msg}`, { error: true });
      figma.ui.postMessage({
        type: 'response',
        data: { 
          error: msg,
          action: 'sync'
        }
      });
    }
  }
};