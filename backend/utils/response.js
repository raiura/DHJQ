/**
 * 统一响应格式工具
 */

class ResponseUtil {
  /**
   * 成功响应
   */
  static success(res, data = null, message = '操作成功') {
    return res.json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 错误响应
   */
  static error(res, message = '操作失败', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
      timestamp: new Date().toISOString()
    };
    
    if (errors) {
      response.errors = errors;
    }
    
    return res.status(statusCode).json(response);
  }

  /**
   * 分页响应
   */
  static paginate(res, data, pagination) {
    return res.json({
      success: true,
      data,
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        totalPages: Math.ceil(pagination.total / pagination.pageSize)
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ResponseUtil;
