export const httpStatusCode = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
}


export const planIdsMap = {
    'monthly': process.env.STRIPE_PRODUCT_MONTHLY_PLAN as string,
    'yearly': process.env.STRIPE_PRODUCT_YEARLY_PLAN as string,
    'lifetime': process.env.STRIPE_PRODUCT_LIFETIME_PLAN as string
}

export const yearlyPriceIdsMap = {
    'intro': process.env.STRIPE_YEARLY_PRICE_INTRO as string,
    'pro': process.env.STRIPE_YEARLY_PRICE_PRO as string
}
