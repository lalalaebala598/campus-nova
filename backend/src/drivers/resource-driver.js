import { htmlMain, textOnly, safeFallback, activityError } from './common.js';

function filenameFromUrl(url = '') {
  try {
    const parts =
      String(url || '')
        .split('/')
        .pop()
        ?.split('?')[0] || '';

    return (
      decodeURIComponent(parts) ||
      'Файл'
    );
  } catch {
    return (
      String(url || '')
        .split('/')
        .pop()
        ?.split('?')[0] ||
      'Файл'
    );
  }
}

function extractResourceFiles(parsed = {}) {
  const html =
    htmlMain(parsed);

  const files = [];
  const seen = new Set();

  const add = (
    rawUrl,
    filename = ''
  ) => {
    const url =
      String(rawUrl || '').trim();

    if (
      !url ||
      seen.has(url)
    ) {
      return;
    }

    const isRealFile =
      /\/(?:pluginfile|webservice\/pluginfile|tokenpluginfile|draftfile)\.php(?:\/|$)/i.test(url) ||
      /\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|7z)(?:$|[?#])/i.test(url);

    if (!isRealFile) {
      return;
    }

    const cleanName =
      String(filename || '').trim() ||
      filenameFromUrl(url);

    /*
     * Moodle/Campus can serve site assets through
     * pluginfile.php too. They are not lesson files.
     */
    if (
      /\.(?:ico|png|jpe?g|gif|svg|webp|bmp|avif|css|js|woff2?|woff|ttf|otf)(?:$|[?#])/i.test(
        cleanName
      ) ||
      /\.(?:ico|png|jpe?g|gif|svg|webp|bmp|avif|css|js|woff2?|woff|ttf|otf)(?:$|[?#])/i.test(
        url
      )
    ) {
      return;
    }

    files.push({
      type: 'file',
      filename: cleanName || 'Файл',
      filepath: '/',
      filesize: 0,
      fileurl: url,
      content: '',
      sortorder: files.length,
      mimetype: ''
    });

    seen.add(url);
  };

  /*
   * IMPORTANT:
   *
   * We only inspect HTML of THIS resource.view request.
   * We never read activity.content.files here.
   */
  /*
   * Only explicit links are files.
   *
   * img/src is intentionally ignored because
   * favicon/logo/theme assets can also use pluginfile.php.
   */
  for (
    const match of String(html || '').matchAll(
      /<a\\b[^>]*href=["']([^"']*(?:\\/pluginfile\\.php|\\/webservice\\/pluginfile\\.php|\\/tokenpluginfile\\.php|\\/draftfile\\.php)[^"']*)["'][^>]*>([\\s\\S]*?)<\\/a>/gi
    )
  ) {
    add(
      match[1],
      textOnly(
        match[2] || ''
      )
    );
  }

  /*
   * parsePage() already calculates the first real
   * file link from the same resource page.
   */
  if (
    files.length === 0 &&
    parsed?.downloadPath
  ) {
    add(
      parsed.downloadPath
    );
  }

  return files;
}

export class ResourceDriver {
  constructor({
    session,
    trace,
    fileService
  } = {}) {
    this.session = session;
    this.trace = trace;
    this.fileService = fileService;
  }

  discover(activity) {
    return {
      type:
        activity?.ref?.type ||
        'unknown',

      driver:
        'ResourceDriver',

      identityKey:
        activity?.identityKey ||
        null
    };
  }

  getCapabilities(
    activity,
    files = []
  ) {
    return {
      canView: true,

      canDownload:
        Array.isArray(files) &&
        files.length > 0,

      canSubmit: null,
      canUpload: null,
      canStart: null,
      canAttempt: null,
      canSave: null,
      canFinish: null
    };
  }

  getActions(
    activity,
    files = []
  ) {
    const actions = [
      {
        name: 'open',
        available: true,
        verification: 'VERIFIED'
      }
    ];

    if (
      Array.isArray(files) &&
      files.length > 0
    ) {
      actions.push({
        name: 'preview',
        available: true,
        verification: 'VERIFIED'
      });

      actions.push({
        name: 'download',
        available: true,
        verification: 'VERIFIED'
      });
    }

    return actions;
  }

  async load(
    activity,
    options = {}
  ) {
    const result =
      await this.session.executeOperation(
        'resource.view',

        {
          ...activity.ref,

          parentTraceId:
            options.parentTraceId,

          activityType:
            activity.ref.type
        },

        {
          cmid:
            activity.ref.cmid
        },

        {
          redirect: 'follow',

          timeoutMs:
            options.timeoutMs ||
            20000
        }
      );

    const html =
      htmlMain(
        result?.parsed
      );

    if (!html) {
      throw activityError(
        'Не удалось открыть ресурс.',
        'RESOURCE_EMPTY',
        'PARSER'
      );
    }

    const title =
      result?.parsed?.title ||
      textOnly(
        html.match(
          /<h[12][^>]*>([\s\S]*?)<\/h[12]>/i
        )?.[1] ||
        activity?.identity?.name ||
        'Материал'
      );

    /*
     * THIS IS THE IMPORTANT PART.
     *
     * Never use:
     *
     *   fileService.listFiles(activity)
     *
     * because that data belongs to the course graph.
     */
    const pageFiles =
      extractResourceFiles(
        result?.parsed || {}
      );

    this.trace?.stage(
      options.parentTraceId,
      'DRIVER_PARSED',
      {
        parser:
          'moodle.html.resource.final',

        title,

        htmlLength:
          html.length,

        pageFiles:
          pageFiles.length
      }
    );

    this.trace?.normalized(
      options.parentTraceId,
      {
        status: 'PASS',

        value: {
          title,

          hasContent:
            Boolean(
              textOnly(html)
            ),

          hasFiles:
            pageFiles.length > 0
        }
      }
    );

    return {
      kind: 'resource',

      title,

      html,

      activityRef:
        activity.ref,

      /*
       * ONLY files belonging to the opened resource.
       */
      files:
        pageFiles,

      source: {
        transport:
          'WEB_FORM',

        operation:
          'resource.view'
      },

      capabilities:
        this.getCapabilities(
          activity,
          pageFiles
        )
    };
  }

  async executeAction(
    activity,
    action,
    payload,
    options = {}
  ) {
    if (
      action === 'open'
    ) {
      return this.load(
        activity,
        options
      );
    }

    const current =
      await this.load(
        activity,
        options
      );

    const file =
      current.files?.[0] ||
      null;

    if (
      (
        action === 'preview' ||
        action === 'download'
      ) &&
      file &&
      this.fileService
    ) {
      const ref =
        this.fileService.resolveFile(
          activity,
          file
        );

      return (
        action === 'preview'
          ? this.fileService.preview(
              ref,
              options
            )
          : this.fileService.download(
              ref,
              options
            )
      );
    }

    throw activityError(
      'Для этого ресурса доступное действие не найдено.',
      'ACTION_UNAVAILABLE',
      'RESOLUTION'
    );
  }

  getFallback(
    activity
  ) {
    return safeFallback(
      activity
    );
  }
}
